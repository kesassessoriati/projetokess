package main

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
)

func SetupRoutes() *mux.Router {
	r := mux.NewRouter()

	// Middleware
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			next.ServeHTTP(w, r)
		})
	})

	// Session methods
	r.HandleFunc("/session/start", HandleSessionStart).Methods("POST")
	r.HandleFunc("/session/qr", HandleSessionQR).Methods("GET")
	r.HandleFunc("/session/logout", HandleSessionLogout).Methods("POST")
	r.HandleFunc("/session/status", HandleSessionStatus).Methods("GET")

	// Messages methods
	r.HandleFunc("/messages/send", HandleSendMessage).Methods("POST")
	r.HandleFunc("/messages/media", HandleSendMedia).Methods("POST")

	// Groups methods
	r.HandleFunc("/groups", HandleGetGroups).Methods("GET")
	r.HandleFunc("/groups/{id}", HandleGetGroupInfo).Methods("GET")
	r.HandleFunc("/groups/{id}/members", HandleGetGroupMembers).Methods("GET")
	r.HandleFunc("/groups/send", HandleSendGroupMessage).Methods("POST")
	r.HandleFunc("/groups/promote", HandlePromoteMember).Methods("POST")
	r.HandleFunc("/groups/remove", HandleRemoveMember).Methods("POST")
	r.HandleFunc("/groups/invite", HandleGroupInvite).Methods("GET")

	return r
}

func jsonResponse(w http.ResponseWriter, status int, payload interface{}) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

func errorResponse(w http.ResponseWriter, status int, message string) {
	jsonResponse(w, status, map[string]string{"error": message})
}
