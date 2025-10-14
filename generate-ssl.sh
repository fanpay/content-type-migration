#!/bin/bash

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[SSL SETUP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🔐 SSL Certificate Generator for Kontent.ai Custom App"
echo "======================================================"

print_status "Generating robust SSL certificates for localhost development..."

# Verificar si ya existen
if [[ -f "localhost.pem" && -f "localhost-key.pem" ]]; then
    print_warning "Certificates already exist!"
    echo "Files found:"
    ls -la localhost*.pem
    echo ""
    read -p "Do you want to regenerate them? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Keeping existing certificates."
        exit 0
    fi
    print_status "Removing existing certificates..."
    rm -f localhost*.pem
fi

# Generar nuevos certificados
print_status "Creating new SSL certificates with enhanced configuration..."

# Crear configuración más robusta para el certificado
cat > localhost.conf << EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no
req_extensions = v3_req

[req_distinguished_name]
C = US
ST = Development
L = Development
O = Kontent.ai Custom App
OU = Development
CN = localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment, keyAgreement
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names
authorityKeyIdentifier = keyid,issuer
subjectKeyIdentifier = hash

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = 127.0.0.1
DNS.4 = ::1
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# Generar certificados
if openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
   -keyout localhost-key.pem \
   -out localhost.pem \
   -config localhost.conf; then
    
    print_success "SSL certificates generated successfully!"
    
    # Limpiar archivo temporal
    rm -f localhost.conf
    
    # Mostrar información
    echo ""
    echo "Generated files:"
    ls -la localhost*.pem
    echo ""
    print_warning "IMPORTANT: Browser Security Setup Required!"
    echo ""
    echo "Your browser will show ERR_CERT_AUTHORITY_INVALID - this is NORMAL for self-signed certificates."
    echo ""
    echo "🔧 HOW TO FIX THE CERTIFICATE ERROR:"
    echo ""
    echo "OPTION 1 - Chrome/Edge (Recommended):"
    echo "1. Go to https://localhost:3001"
    echo "2. Click 'Advanced' or 'Show details'"
    echo "3. Click 'Proceed to localhost (unsafe)' or 'Continue to localhost'"
    echo ""
    echo "OPTION 2 - Add to macOS Keychain:"
    echo "1. Double-click 'localhost.pem' to open Keychain Access"
    echo "2. Find 'localhost' certificate in 'login' keychain"
    echo "3. Double-click it > Trust > When using this certificate: Always Trust"
    echo "4. Close and restart your browser"
    echo ""
    echo "OPTION 3 - Firefox:"
    echo "1. Go to https://localhost:3001"
    echo "2. Click 'Advanced'"
    echo "3. Click 'Accept the Risk and Continue'"
    echo ""
    print_success "You can now run: npm run dev"
    print_success "And access: https://localhost:3001"
    
else
    echo "Error generating certificates. Trying alternative method..."
    
    # Método simple como fallback
    openssl req -x509 -out localhost.pem -keyout localhost-key.pem \
        -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' \
        -extensions EXT -config <(printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")
    
    if [[ -f "localhost.pem" && -f "localhost-key.pem" ]]; then
        print_success "SSL certificates generated with alternative method!"
    else
        echo "❌ Failed to generate SSL certificates."
        echo "Please check your OpenSSL installation."
        exit 1
    fi
fi

echo ""
print_success "SSL setup complete! 🔒"