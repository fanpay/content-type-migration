#!/bin/bash

echo "🚀 Content Type Migration - Setup Script"
echo "========================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo ""
print_status "Checking dependencies..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Verificar npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Verificar OpenSSL
if ! command -v openssl &> /dev/null; then
    print_error "OpenSSL is not installed. Please install OpenSSL first."
    exit 1
fi

print_success "All dependencies found!"

echo ""
print_status "Installing npm dependencies..."

if npm install; then
    print_success "Dependencies installed successfully!"
else
    print_error "Failed to install dependencies."
    exit 1
fi

echo ""
print_status "Checking SSL certificates..."

# Verificar si ya existen certificados
if [[ -f "localhost.pem" && -f "localhost-key.pem" ]]; then
    print_warning "SSL certificates already exist. Skipping generation."
else
    print_status "Generating SSL certificates..."
    
    # Generar certificados SSL
    if openssl req -x509 -out localhost.pem -keyout localhost-key.pem \
       -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' \
       -extensions EXT -config <(printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth") 2>/dev/null; then
        print_success "SSL certificates generated successfully!"
    else
        print_error "Failed to generate SSL certificates."
        exit 1
    fi
fi

echo ""
print_status "Setting up environment configuration..."

# Crear .env.local si no existe
if [[ ! -f ".env.local" ]]; then
    if [[ -f ".env.example" ]]; then
        cp .env.example .env.local
        print_success "Created .env.local from .env.example"
        print_warning "Please edit .env.local and add your Kontent.ai credentials!"
    else
        print_warning ".env.example not found. Please create .env.local manually."
    fi
else
    print_warning ".env.local already exists. Please verify your credentials."
fi

echo ""
print_success "Setup completed successfully! 🎉"
echo ""
echo "Next steps:"
echo "1. Edit .env.local and add your Kontent.ai credentials"
echo "2. Run: npm run dev"
echo "3. Open: https://localhost:3001"
echo "4. Configure the Custom App in Kontent.ai with URL: https://localhost:3001"
echo ""
print_status "For detailed instructions, see README.md"