package main

import (
	"log"
	"net/http"
	"os"
)

func main() {
	log.Println("Starting WhatsApp Go Service...")

	InitStore("store.db")
	router := SetupRoutes()

	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	log.Printf("Server running on port %s", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatal(err)
	}
}
