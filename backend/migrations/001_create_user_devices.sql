-- Criar tabela para dispositivos móveis dos usuários
CREATE TABLE IF NOT EXISTS "UserDevices" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "deviceToken" TEXT NOT NULL,
  "platform" VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "deviceToken")
);

-- Criar índice para busca rápida por userId
CREATE INDEX IF NOT EXISTS "idx_user_devices_userId" ON "UserDevices"("userId");

-- Criar índice para busca rápida por deviceToken
CREATE INDEX IF NOT EXISTS "idx_user_devices_deviceToken" ON "UserDevices"("deviceToken");

-- Trigger para atualizar updatedAt automaticamente
CREATE OR REPLACE FUNCTION update_user_device_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updatedAt = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_device_updated_at_trigger
  BEFORE UPDATE ON "UserDevices"
  FOR EACH ROW
  EXECUTE FUNCTION update_user_device_updated_at();
