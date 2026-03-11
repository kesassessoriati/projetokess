FROM golang:1.22-alpine

WORKDIR /app

RUN apk add --no-cache gcc musl-dev sqlite-dev

COPY go.mod ./
RUN go mod download || true

COPY . .
RUN go mod tidy
RUN go build -o whatsapp-service .

EXPOSE 3001

CMD ["./whatsapp-service"]
