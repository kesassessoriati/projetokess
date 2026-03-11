package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
	"go.mau.fi/whatsmeow/types"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"google.golang.org/protobuf/proto"
)

func HandleGetGroups(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session")
	client := GetClient(sessionID)
	if client == nil || !client.IsConnected() {
		errorResponse(w, http.StatusUnauthorized, "Session not connected")
		return
	}

	groups, err := client.GetJoinedGroups()
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"groups": groups,
	})
}

func HandleGetGroupInfo(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session")
	clientID := mux.Vars(r)["id"]
	client := GetClient(sessionID)
	if client == nil || !client.IsConnected() {
		errorResponse(w, http.StatusUnauthorized, "Session not connected")
		return
	}

	jid, _ := types.ParseJID(clientID + "@g.us")
	info, err := client.GetGroupInfo(jid)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, info)
}

func HandleGetGroupMembers(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session")
	clientID := mux.Vars(r)["id"]
	client := GetClient(sessionID)
	if client == nil || !client.IsConnected() {
		errorResponse(w, http.StatusUnauthorized, "Session not connected")
		return
	}

	jid, _ := types.ParseJID(clientID + "@g.us")
	info, err := client.GetGroupInfo(jid)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"members": info.Participants,
	})
}

func HandleSendGroupMessage(w http.ResponseWriter, r *http.Request) {
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

	jid, _ := types.ParseJID(body.To + "@g.us")

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

func HandlePromoteMember(w http.ResponseWriter, r *http.Request) {
	var body struct {
		SessionID string `json:"session"`
		GroupID   string `json:"group_id"`
		MemberID  string `json:"member_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	client := GetClient(body.SessionID)
	if client == nil || !client.IsConnected() {
		errorResponse(w, http.StatusUnauthorized, "Session not connected")
		return
	}

	groupJid, _ := types.ParseJID(body.GroupID + "@g.us")
	userJid := types.NewJID(body.MemberID, "s.whatsapp.net")

	err := client.UpdateGroupParticipants(groupJid, []types.JID{userJid}, whatsmeow.ParticipantChangePromote)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

func HandleRemoveMember(w http.ResponseWriter, r *http.Request) {
	var body struct {
		SessionID string `json:"session"`
		GroupID   string `json:"group_id"`
		MemberID  string `json:"member_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	client := GetClient(body.SessionID)
	if client == nil || !client.IsConnected() {
		errorResponse(w, http.StatusUnauthorized, "Session not connected")
		return
	}

	groupJid, _ := types.ParseJID(body.GroupID + "@g.us")
	
	// Ensure the member ID is raw (no split suffix)
	var userJid types.JID
	if strings.Contains(body.MemberID, "@") {
		userJid, _ = types.ParseJID(body.MemberID)
	} else {
		userJid = types.NewJID(body.MemberID, "s.whatsapp.net")
	}

	err := client.UpdateGroupParticipants(groupJid, []types.JID{userJid}, whatsmeow.ParticipantChangeRemove)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

func HandleGroupInvite(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session")
	groupID := r.URL.Query().Get("group_id")

	client := GetClient(sessionID)
	if client == nil || !client.IsConnected() {
		errorResponse(w, http.StatusUnauthorized, "Session not connected")
		return
	}

	groupJid, _ := types.ParseJID(groupID + "@g.us")
	link, err := client.GetGroupInviteLink(groupJid, false)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{
		"link": link,
	})
}
