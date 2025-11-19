// State management
let currentUserType = 'admin';
let currentSection = 'dashboard';
let loginAttempts = 0;
let isDarkTheme = false;
let currentEditingProduct = null;
let selectedInvoiceFile = null;
let currentInvoiceContext = null;

// Matriz de usuarios [[email, password, tipo]]
const users = [
    ['admin@colmena.com', 'correcta', 'Administrador'],
    ['juan@agrosur.com', 'correcta', 'Cliente'],
    ['maria@agropecuaria.com', 'correcta', 'Cliente'],
    ['carlos@campofértil.com', 'correcta', 'Cliente']
];

// Base de datos simulada para productos
const productsDB = {
    'PROD-001': {
        name: 'Tractor John Deere 6120M',
        category: 'maquinaria',
        stock: 5,
        minStock: 2,
        price: 500,
        description: 'Tractor agrícola de 120HP, ideal para labranza y cosecha'
    },
    'PROD-002': {
        name: 'Fertilizante NPK 15-15-15',
        category: 'insumos',
        stock: 15,
        minStock: 20,
        price: 45,
        description: 'Fertilizante balanceado para todo tipo de cultivos'
    },
    'PROD-003': {
        name: 'Semillas de Trigo Premium',
        category: 'semillas',
        stock: 0,
        minStock: 100,
        price: 120,
        description: 'Semillas certificadas de alto rendimiento'
    }
};

// Base de datos simulada para facturas
const invoicesDB = {};

// ========== SISTEMA DE LOGIN ==========
function validateLogin(email, password) {
    for (let user of users) {
        if (user[0] === email && user[1] === password) {
            return {
                valid: true,
                type: user[2]
            };
        }
    }
    return { valid: false };
}

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.toLowerCase().trim();
    const password = document.getElementById('password').value;

    const validation = validateLogin(email, password);
    
    if (!validation.valid) {
        loginAttempts++;
        
        if (loginAttempts >= 3) {
            document.getElementById('blockedMessage').style.display = 'block';
            alert('¡Cuenta bloqueada! Demasiados intentos fallidos.');
            return;
        } else {
            alert(`Credenciales incorrectas. Intentos: ${loginAttempts}/3`);
            return;
        }
    }

    // Successful login
    loginAttempts = 0;
    document.getElementById('blockedMessage').style.display = 'none';
    
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    
    const userType = validation.type.toLowerCase().includes('admin') ? 'admin' : 'client';
    currentUserType = userType;
    
    document.getElementById('userEmail').textContent = email;
    document.getElementById('userName').textContent = validation.type;
    
    const userBadge = document.getElementById('userBadge');
    userBadge.textContent = validation.type;
    userBadge.className = `user-badge ${userType}`;
    
    const appContent = document.querySelector('.app-content');
    appContent.classList.remove('admin-view', 'client-view');
    appContent.classList.add(userType + '-view');
    
    if (userType === 'client') {
        showSection('products');
    } else {
        showSection('dashboard');
    }
});

// ========== FUNCIONALIDAD DE EDITAR PRODUCTOS ==========
function editProduct(productId) {
    currentEditingProduct = productId;
    const product = productsDB[productId];
    
    if (!product) {
        alert('Producto no encontrado');
        return;
    }
    
    // Llenar el formulario con datos actuales
    document.getElementById('editProductId').textContent = productId;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductCategory').value = product.category;
    document.getElementById('editProductStock').value = product.stock;
    document.getElementById('editProductMinStock').value = product.minStock;
    document.getElementById('editProductPrice').value = product.price || '';
    document.getElementById('editProductDescription').value = product.description || '';
    
    closeAllModals();
    document.getElementById('editProductModal').style.display = 'flex';
}

// Manejar el envío del formulario de edición
document.getElementById('editProductForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!currentEditingProduct) return;
    
    // Obtener nuevos valores
    const updatedProduct = {
        name: document.getElementById('editProductName').value,
        category: document.getElementById('editProductCategory').value,
        stock: parseInt(document.getElementById('editProductStock').value),
        minStock: parseInt(document.getElementById('editProductMinStock').value),
        price: parseFloat(document.getElementById('editProductPrice').value) || 0,
        description: document.getElementById('editProductDescription').value
    };
    
    // Actualizar en la base de datos simulada
    productsDB[currentEditingProduct] = updatedProduct;
    
    alert(`Producto ${currentEditingProduct} actualizado exitosamente.\n\nLos cambios se reflejarán en el sistema.`);
    
    closeModal('editProductModal');
    currentEditingProduct = null;
});

// ========== SISTEMA DE FACTURAS ==========
function manageInvoices(context, reference) {
    currentInvoiceContext = context;
    document.getElementById('invoiceReference').textContent = reference;
    
    // Cargar facturas existentes
    loadInvoices(context, reference);
    
    closeAllModals();
    document.getElementById('invoiceManagementModal').style.display = 'flex';
}

function loadInvoices(context, reference) {
    const invoiceList = document.getElementById('invoiceList');
    const key = `${context}_${reference}`;
    
    if (!invoicesDB[key] || invoicesDB[key].length === 0) {
        document.getElementById('noInvoicesMessage').style.display = 'block';
        invoiceList.innerHTML = '<div class="no-invoices" id="noInvoicesMessage"><p>No hay facturas adjuntas</p></div>';
        return;
    }
    
    document.getElementById('noInvoicesMessage').style.display = 'none';
    
    invoiceList.innerHTML = invoicesDB[key].map((invoice, index) => `
        <div class="invoice-item">
            <div class="invoice-info">
                <div class="invoice-name">${invoice.name}</div>
                <div class="invoice-meta">
                    ${invoice.description} • ${new Date(invoice.date).toLocaleDateString()}
                </div>
            </div>
            <div class="invoice-actions">
                <button class="btn btn-primary btn-sm" onclick="viewInvoice('${key}', ${index})">Ver</button>
                <button class="btn btn-danger btn-sm" onclick="deleteInvoice('${key}', ${index})">Eliminar</button>
            </div>
        </div>
    `).join('');
}

function handleInvoiceFileSelect(input) {
    const file = input.files[0];
    if (file) {
        selectedInvoiceFile = file;
        document.getElementById('selectedFileInfo').innerHTML = `
            <strong>Archivo seleccionado:</strong> ${file.name}<br>
            <small>Tamaño: ${(file.size / 1024 / 1024).toFixed(2)} MB</small>
        `;
    }
}

function uploadInvoice() {
    if (!selectedInvoiceFile) {
        alert('Por favor selecciona un archivo primero');
        return;
    }
    
    const description = document.getElementById('invoiceDescription').value || 'Sin descripción';
    const key = `${currentInvoiceContext}_${document.getElementById('invoiceReference').textContent}`;
    
    // Inicializar array si no existe
    if (!invoicesDB[key]) {
        invoicesDB[key] = [];
    }
    
    // Agregar factura a la base de datos
    const newInvoice = {
        name: selectedInvoiceFile.name,
        description: description,
        date: new Date().toISOString(),
        size: selectedInvoiceFile.size,
        type: selectedInvoiceFile.type
    };
    
    invoicesDB[key].unshift(newInvoice);
    
    // Limpiar formulario
    document.getElementById('invoiceFileInput').value = '';
    document.getElementById('invoiceDescription').value = '';
    document.getElementById('selectedFileInfo').innerHTML = '';
    selectedInvoiceFile = null;
    
    // Recargar lista
    loadInvoices(currentInvoiceContext, document.getElementById('invoiceReference').textContent);
    
    alert('Factura adjuntada exitosamente');
}

function viewInvoice(key, index) {
    const invoice = invoicesDB[key][index];
    alert(`Vista previa de factura:\n\nNombre: ${invoice.name}\nDescripción: ${invoice.description}\nFecha: ${new Date(invoice.date).toLocaleDateString()}\nTamaño: ${(invoice.size / 1024).toFixed(2)} KB\n\nEn un sistema real, aquí se mostraría el archivo PDF/imagen.`);
}

function deleteInvoice(key, index) {
    if (confirm('¿Estás seguro de que deseas eliminar esta factura?')) {
        invoicesDB[key].splice(index, 1);
        loadInvoices(currentInvoiceContext, document.getElementById('invoiceReference').textContent);
        alert('Factura eliminada exitosamente');
    }
}

// ========== NUEVAS FUNCIONALIDADES PARA SECCIONES ==========

// Funciones de filtrado para nuevas secciones
function filterMachinery() {
    console.log('Filtrando maquinaria...');
}

function filterSupplies() {
    console.log('Filtrando insumos...');
}

function filterRentals() {
    console.log('Filtrando préstamos...');
}

function filterMyInvoices() {
    console.log('Filtrando mis facturas...');
}

// Sistema de reportes
function showReportTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[onclick="showReportTab('${tab}')"]`).classList.add('active');
    
    console.log(`Mostrando reporte: ${tab}`);
}

// Sistema de alertas
function markAsRead(alertId) {
    alert(`Alerta ${alertId} marcada como leída`);
}

function markAllAsRead() {
    alert('Todas las alertas marcadas como leídas');
}

function reorderProduct(productId) {
    alert(`Solicitando reorden de producto: ${productId}`);
}

function scheduleMaintenance(equipmentId) {
    alert(`Programando mantenimiento para: ${equipmentId}`);
}

function recoverEquipment(equipmentId) {
    alert(`Iniciando proceso de recuperación: ${equipmentId}`);
}

// Sistema de facturas para cliente
function viewClientInvoice(invoiceId) {
    alert(`Descargando factura: ${invoiceId}\n\nEn un sistema real, se descargaría el archivo PDF.`);
}

function viewInvoiceDetails(invoiceId) {
    alert(`Mostrando detalles de factura: ${invoiceId}\n\n• Número: ${invoiceId}\n• Fecha: 15/11/2024\n• Monto: $7,000\n• Estado: Pagada\n• Descripción: Alquiler de maquinaria`);
}

function requestCopy(invoiceId) {
    alert(`Solicitando copia de factura: ${invoiceId}\n\nLa copia será enviada a tu correo electrónico.`);
}

function payInvoice(invoiceId) {
    alert(`Procesando pago de factura: ${invoiceId}\n\nRedirigiendo a pasarela de pago...`);
}

// ========== FUNCIONALIDADES EXISTENTES ==========
function showResetPassword() {
    closeAllModals();
    document.getElementById('resetPasswordModal').style.display = 'flex';
}

function logout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
        document.getElementById('loginForm').reset();
        loginAttempts = 0;
        document.getElementById('blockedMessage').style.display = 'none';
    }
}

function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme', isDarkTheme);
    document.querySelector('.theme-toggle').textContent = isDarkTheme ? '☀️' : '🌙';
}

function showSection(section) {
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.style.display = 'none';
    });
    
    document.querySelectorAll('.nav-links li').forEach(item => {
        item.classList.remove('active');
    });
    
    document.getElementById(section + 'Section').style.display = 'block';
    const navItem = document.querySelector(`.nav-links li[onclick="showSection('${section}')"]`);
    if (navItem) navItem.classList.add('active');
    
    currentSection = section;
}

function showTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[onclick="showTab('${tab}')"]`).classList.add('active');
}

function filterProducts() {
    const search = document.getElementById('searchProduct').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const stock = document.getElementById('stockFilter').value;
    
    const rows = document.querySelectorAll('#productsTable tbody tr');
    
    rows.forEach(row => {
        const name = row.cells[1].textContent.toLowerCase();
        const rowCategory = row.getAttribute('data-category');
        const rowStock = row.getAttribute('data-stock');
        
        const matchesSearch = name.includes(search) || row.cells[0].textContent.toLowerCase().includes(search);
        const matchesCategory = !category || rowCategory === category;
        const matchesStock = !stock || rowStock === stock;
        
        row.style.display = matchesSearch && matchesCategory && matchesStock ? '' : 'none';
    });
}

function filterClientProducts() {
    const search = document.getElementById('searchClientProduct').value.toLowerCase();
    const category = document.getElementById('clientCategoryFilter').value;
    const type = document.getElementById('clientTypeFilter').value;
    
    const cards = document.querySelectorAll('.product-card');
    
    cards.forEach(card => {
        const name = card.querySelector('h3').textContent.toLowerCase();
        const cardCategory = card.getAttribute('data-category');
        const cardType = card.getAttribute('data-type');
        
        const matchesSearch = name.includes(search);
        const matchesCategory = !category || cardCategory === category;
        const matchesType = !type || cardType === type;
        
        card.style.display = matchesSearch && matchesCategory && matchesType ? '' : 'none';
    });
}

function showAddProductModal() {
    alert('Funcionalidad de agregar producto - En desarrollo');
}

function showMovementHistory(productId) {
    closeAllModals();
    document.getElementById('productIdTitle').textContent = productId;
    document.getElementById('movementHistoryModal').style.display = 'flex';
}

function deleteProduct(productId) {
    if (confirm(`¿Estás seguro de que deseas eliminar el producto ${productId}?`)) {
        alert(`Producto ${productId} eliminado exitosamente.`);
    }
}

function requestProduct(productId) {
    closeAllModals();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('requestDate').value = today;
    
    document.getElementById('requestProductName').textContent = getProductName(productId);
    document.getElementById('requestProductModal').style.display = 'flex';
}

function getProductName(productId) {
    const products = {
        'PROD-001': 'Tractor John Deere 6120M',
        'PROD-002': 'Fertilizante NPK 15-15-15',
        'PROD-003': 'Semillas de Trigo Premium'
    };
    return products[productId] || 'Producto';
}

document.getElementById('requestType')?.addEventListener('change', function(e) {
    const durationGroup = document.getElementById('durationGroup');
    const quantityLabel = document.getElementById('quantityLabel');
    
    if (e.target.value === 'alquiler') {
        durationGroup.style.display = 'block';
        quantityLabel.textContent = 'Cantidad (unidades)';
    } else {
        durationGroup.style.display = 'none';
        quantityLabel.textContent = 'Cantidad';
    }
});

function validateStock(productId, quantity) {
    closeAllModals();
    document.getElementById('stockValidationMessage').textContent = 
        `Validando stock para ${productId}\n\nSolicitado: ${quantity} unidades\nDisponible: 5 unidades\n\n¿Confirmar salida?`;
    document.getElementById('stockValidationModal').style.display = 'flex';
}

function confirmWithdrawal() {
    alert('Salida confirmada. Stock actualizado exitosamente.');
    closeModal('stockValidationModal');
}

document.getElementById('requestProductForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const productName = document.getElementById('requestProductName').textContent;
    const requestType = document.getElementById('requestType').value;
    const quantity = document.getElementById('requestQuantity').value;
    
    alert(`¡Solicitud enviada exitosamente!\n\nProducto: ${productName}\nTipo: ${requestType}\nCantidad: ${quantity}\n\nLa administración revisará tu solicitud pronto.`);
    closeModal('requestProductModal');
});

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        input.value = today;
        input.min = today;
    });
    
    document.getElementById('resetPasswordForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Se han enviado las instrucciones de restablecimiento a tu correo electrónico.');
        closeModal('resetPasswordModal');
    });
    
    console.log('Sistema Colmena inicializado correctamente');
});

// ========== FUNCIONES DE DEMO ==========
function demoAdminLogin() {
    document.getElementById('email').value = 'admin@colmena.com';
    document.getElementById('password').value = 'correcta';
    document.getElementById('loginForm').dispatchEvent(new Event('submit'));
}

function demoClientLogin() {
    document.getElementById('email').value = 'juan@agrosur.com';
    document.getElementById('password').value = 'correcta';
    document.getElementById('loginForm').dispatchEvent(new Event('submit'));
}

function demoEditProduct() {
    editProduct('PROD-001');
}

function demoInvoiceSystem() {
    manageInvoices('préstamo', 'PREST-2024-001');
}

function demoStockValidation() {
    validateStock('PROD-001', 2);
}

function demoMovementHistory() {
    showMovementHistory('PROD-001');
}

function demoMachinerySection() {
    showSection('machinery');
}

function demoSuppliesSection() {
    showSection('supplies');
}

function demoRentalsSection() {
    showSection('rentals');
}

function demoReportsSection() {
    showSection('reports');
}

function demoAlertsSection() {
    showSection('alerts');
}

function demoClientInvoices() {
    showSection('myInvoices');
}