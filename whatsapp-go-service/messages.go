package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"go.mau.fi/whatsmeow/types"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"google.golang.org/protobuf/proto"
)

func HandleSendMessage(w http.ResponseWriter, r *http.Request) {
	var body struct {
		SessionID string `json:"session"`
		To      string `json:"to"`
		Text    string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	client := GetClient(body.SessionID)
	if client == nil || !client.IsConnected() {
		errorResponse(w, http.StatusUnauthorized, "Session not connected")
		return
	}

	jid, _ := types.ParseJID(body.To)
	if !strings.Contains(body.To, "@") {
		jid, _ = types.ParseJID(body.To + "@s.whatsapp.net")
	}

	msg := &waProto.Message{
		Conversation: proto.String(body.Text),
	}

	resp, err := client.SendMessage(context.Background(), jid, msg)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"id":     resp.ID,
		"timestamp": resp.Timestamp,
	})
}

func HandleSendMedia(w http.ResponseWriter, r *http.Request) {
	// Not implemented perfectly, missing multipart parsing for simplicity
	// You might want to upload media via Whatsmeow Upload() and then send message
	errorResponse(w, http.StatusNotImplemented, "Not implemented yet, requires multipart form handling")
}
