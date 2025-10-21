#!/bin/bash

# 🧪 Script de Teste - Sistema de Reset de Senha
# Execute: chmod +x scripts/test-reset-password.sh && ./scripts/test-reset-password.sh

echo "========================================="
echo "🔐 TESTE - Sistema de Reset de Senha"
echo "========================================="
echo ""

# Configurações
API_URL="http://localhost:3001"
EMAIL="teste@email.com"

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ==========================================
# TESTE 1: Solicitar Reset de Senha
# ==========================================
echo -e "${YELLOW}📧 TESTE 1: Solicitando reset de senha para ${EMAIL}${NC}"
echo ""

RESPONSE=$(curl -s -X POST ${API_URL}/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\"}")

echo "Resposta:"
echo "$RESPONSE" | jq .

if echo "$RESPONSE" | grep -q "receberá instruções"; then
  echo -e "${GREEN}✅ PASSOU: Endpoint funcionando${NC}"
else
  echo -e "${RED}❌ FALHOU: Resposta inesperada${NC}"
fi

echo ""
echo "========================================="
echo ""

# ==========================================
# TESTE 2: Validar Token (Manual)
# ==========================================
echo -e "${YELLOW}🔍 TESTE 2: Validação de Token${NC}"
echo ""
echo "ℹ️  Este teste requer um token válido do email."
echo "Digite o token recebido no email (ou pressione Enter para pular):"
read -r TOKEN

if [ -n "$TOKEN" ]; then
  echo ""
  echo "Validando token: $TOKEN"
  echo ""
  
  RESPONSE=$(curl -s -X POST ${API_URL}/auth/validate-reset-token \
    -H "Content-Type: application/json" \
    -d "{\"token\":\"${TOKEN}\"}")
  
  echo "Resposta:"
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | grep -q "\"valid\":true"; then
    echo -e "${GREEN}✅ PASSOU: Token válido${NC}"
    
    # ==========================================
    # TESTE 3: Redefinir Senha
    # ==========================================
    echo ""
    echo "========================================="
    echo ""
    echo -e "${YELLOW}🔑 TESTE 3: Redefinindo senha${NC}"
    echo ""
    
    NEW_PASSWORD="NovaSenha123!"
    
    RESPONSE=$(curl -s -X POST ${API_URL}/auth/reset-password \
      -H "Content-Type: application/json" \
      -d "{\"token\":\"${TOKEN}\",\"newPassword\":\"${NEW_PASSWORD}\"}")
    
    echo "Resposta:"
    echo "$RESPONSE" | jq .
    
    if echo "$RESPONSE" | grep -q "sucesso"; then
      echo -e "${GREEN}✅ PASSOU: Senha redefinida com sucesso${NC}"
    else
      echo -e "${RED}❌ FALHOU: Erro ao redefinir senha${NC}"
    fi
    
  elif echo "$RESPONSE" | grep -q "expirado"; then
    echo -e "${YELLOW}⏰ Token expirado (esperado se passou > 1 hora)${NC}"
  else
    echo -e "${RED}❌ FALHOU: Token inválido${NC}"
  fi
else
  echo "⏭️  Pulando testes 2 e 3 (token não fornecido)"
fi

echo ""
echo "========================================="
echo ""
echo -e "${GREEN}✅ Testes finalizados!${NC}"
echo ""
echo "📝 Próximos passos:"
echo "  1. Verifique sua caixa de entrada (${EMAIL})"
echo "  2. Copie o token do email"
echo "  3. Execute novamente este script e cole o token"
echo ""
echo "📚 Documentação completa: docs/EMAIL_SETUP.md"
echo ""

