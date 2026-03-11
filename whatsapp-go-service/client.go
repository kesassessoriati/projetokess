package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
)

var (
	clientsMap = make(map[string]*whatsmeow.Client)
	qrMap      = make(map[string]string)
	clientsMu  sync.RWMutex
	dbStore    *sqlstore.Container
)

func InitStore(dbPath string) {
	dbLog := waLog.Stdout("Database", "DEBUG", true)
	var err error
	dbStore, err = sqlstore.New("sqlite3", fmt.Sprintf("file:%s?_foreign_keys=on", dbPath), dbLog)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
}

func GetClient(sessionID string) *whatsmeow.Client {
	clientsMu.RLock()
	defer clientsMu.RUnlock()
	return clientsMap[sessionID]
}

func StoreClient(sessionID string, client *whatsmeow.Client) {
	clientsMu.Lock()
	defer clientsMu.Unlock()
	clientsMap[sessionID] = client
}

func RemoveClient(sessionID string) {
	clientsMu.Lock()
	defer clientsMu.Unlock()
	delete(clientsMap, sessionID)
}

func eventHandler(sessionID string, evt interface{}) {
	webhookURL := os.Getenv("WEBHOOK_URL")
	if webhookURL == "" {
		webhookURL = "http://localhost:3000/webhook/whatsmeow"
	}

	payload := map[string]interface{}{
		"session": sessionID,
		"event":   "",
		"data":    evt,
	}

	switch v := evt.(type) {
	case *events.Message:
		payload["event"] = "messages"
	case *events.Receipt:
		payload["event"] = "read receipts"
	case *events.GroupInfo:
		payload["event"] = "group updates"
	case *events.JoinedGroup:
		payload["event"] = "participants changes"
	case *events.QR:
		// Save QR
		clientsMu.Lock()
		qrMap[sessionID] = v.Codes[0]
		clientsMu.Unlock()
		return // Don't send QR down webhook for now
	case *events.Connected:
		clientsMu.Lock()
		delete(qrMap, sessionID)
		clientsMu.Unlock()
		payload["event"] = "connected"
	case *events.Disconnected:
		payload["event"] = "disconnected"
	default:
		return
	}

	jsonData, err := json.Marshal(payload)
	if err == nil {
		go func() {
			client := &http.Client{Timeout: 5 * time.Second}
			client.Post(webhookURL, "application/json", bytes.NewBuffer(jsonData))
		}()
	}
}

func StartSession(sessionID string) error {
	client := GetClient(sessionID)
	if client != nil {
		if client.IsConnected() {
			return nil
		}
	}

	// For multi-tenant we need a way to link sessionID to JID, or just use a new device 
	// To keep it simple, we retrieve the first associated device or create new
	// In production, you would map sessionID to specific device store ID
	var deviceStore *store.Device
	devices, err := dbStore.GetAllDevices()
	if err != nil {
		return err
	}
	
	for _, dev := range devices {
		// Just taking the existing ones. Alternatively keep track of sessionID -> JID
		// Here we assume mapping is done correctly or we just create a new one for new session
		// Usually you'd use a separate mapping table
		if dev.ID != nil {
			// For simplicity we just use first available or new
			// A full mapping requires DB
		}
	}
	deviceStore = dbStore.NewDevice()
	
	clientLog := waLog.Stdout("Client", "DEBUG", true)
	client = whatsmeow.NewClient(deviceStore, clientLog)
	client.AddEventHandler(func(evt interface{}) {
		eventHandler(sessionID, evt)
	})

	StoreClient(sessionID, client)

	if client.Store.ID == nil {
		// New device, need QR
		qrChan, _ := client.GetQRChannel(context.Background())
		err = client.Connect()
		if err != nil {
			return err
		}
		
		go func() {
			for evt := range qrChan {
				if evt.Event == "code" {
					clientsMu.Lock()
					qrMap[sessionID] = evt.Code
					clientsMu.Unlock()
				}
			}
		}()
	} else {
		// Already logged in
		err = client.Connect()
		if err != nil {
			return err
		}
	}
	
	return nil
}

func LogoutSession(sessionID string) error {
	client := GetClient(sessionID)
	if client != nil {
		client.Logout()
		client.Disconnect()
		RemoveClient(sessionID)
		clientsMu.Lock()
		delete(qrMap, sessionID)
		clientsMu.Unlock()
	}
	return nil
}
