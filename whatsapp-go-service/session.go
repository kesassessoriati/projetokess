package main

import (
	"encoding/json"
	"net/http"
)

func HandleSessionStart(w http.ResponseWriter, r *http.Request) {
	var body struct {
		SessionID string `json:"session"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	err := StartSession(body.SessionID)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{
		"message": "Session started",
		"session": body.SessionID,
	})
}

func HandleSessionQR(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session")
	if sessionID == "" {
		errorResponse(w, http.StatusBadRequest, "Missing session parameter")
		return
	}

	clientsMu.RLock()
	qrCode, ok := qrMap[sessionID]
	clientsMu.RUnlock()

	if !ok {
		errorResponse(w, http.StatusNotFound, "QR code not available or session already connected")
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{
		"session": sessionID,
		"qr":      qrCode,
	})
}

func HandleSessionLogout(w http.ResponseWriter, r *http.Request) {
	var body struct {
		SessionID string `json:"session"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	err := LogoutSession(body.SessionID)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{
		"message": "Session logged out",
		"session": body.SessionID,
	})
}

func HandleSessionStatus(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session")
	if sessionID == "" {
		errorResponse(w, http.StatusBadRequest, "Missing session parameter")
		return
	}

	client := GetClient(sessionID)
	if client == nil {
		jsonResponse(w, http.StatusOK, map[string]string{
			"status": "disconnected",
		})
		return
	}

	status := "disconnected"
	if client.IsConnected() {
		status = "connected"
		if !client.IsLoggedIn() {
			status = "qr"
		}
	}

	jsonResponse(w, http.StatusOK, map[string]string{
		"status": status,
		"session": sessionID,
	})
}
