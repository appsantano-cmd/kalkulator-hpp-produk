import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// GANTI DENGAN URL DEPLOYMENT ANDA
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

const CATEGORIES = {
  'MAKANAN': ['APPETIZER', 'MAIN_COURSE', 'DESSERT', 'BREAKFAST', 'SNACK', 'LAINNYA'],
  'MINUMAN': ['SIGNATURE', 'COFFEE', 'TEA', 'JUICE', 'MOCKTAIL', 'LAINNYA']
};

const App = () => {
  // State untuk Menu/HPP
  const [menuName, setMenuName] = useState('');
  const [category, setCategory] = useState('MAKANAN');
  const [subcategory, setSubcategory] = useState('MAIN_COURSE');
  const [brand, setBrand] = useState('');
  const [targetCost, setTargetCost] = useState('');
  const [targetQty, setTargetQty] = useState('1');
  const [profitMargin, setProfitMargin] = useState(40);
  const [gofoodPercentage, setGofoodPercentage] = useState(20);
  const [taxPercentage, setTaxPercentage] = useState(10);
  const [notes, setNotes] = useState('');
  
  // State untuk Bahan/Resep
  const [ingredients, setIngredients] = useState([{
    id: 1,
    name: '',
    usage: '',
    unit: 'GRAM',
    purchase_price: '',
    purchase_unit: '',
    purchase_unit_type: 'GRAM',
    category: 'BAHAN_UTAMA',
    supplier: '',
    notes: ''
  }]);
  
  const [packaging, setPackaging] = useState({
    name: 'Packaging',
    cost: '',
    quantity: '1'
  });
  
  // State untuk UI & Data
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState('checking');
  const [savedMenus, setSavedMenus] = useState([]);
  const [showMenuList, setShowMenuList] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCategory, setSearchCategory] = useState('ALL');
  const [activeTab, setActiveTab] = useState('hpp');
  const [editMode, setEditMode] = useState(false);
  const [currentMenuId, setCurrentMenuId] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(1);

  // Initialize
  useEffect(() => {
    testConnection();
  }, []);

  // ===== CONNECTION & INITIALIZATION =====
  const testConnection = async () => {
    try {
      setStatus({ type: 'loading', message: 'Testing connection...' });
      setConnection('checking');
      
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=ping`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setConnection('connected');
          setStatus({ type: 'success', message: '✅ Connected to Google Sheets!' });
          
          // Load menus
          loadMenus();
          
          return true;
        }
      }
      
      throw new Error('Connection failed');
      
    } catch (error) {
      console.error('Connection error:', error);
      setConnection('error');
      setStatus({ 
        type: 'warning', 
        message: '⚠️ Cannot connect to Google Sheets. Please check deployment.' 
      });
      return false;
    }
  };

  const initializeSheets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=initialize`);
      const result = await response.json();
      
      if (result.success) {
        setStatus({ type: 'success', message: result.message });
      } else {
        setStatus({ type: 'error', message: result.message });
      }
    } catch (error) {
      console.error('Initialize error:', error);
      setStatus({ type: 'error', message: 'Initialize failed: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // ===== LOAD DATA FUNCTIONS =====
  const loadMenus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=get_menus`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSavedMenus(result.menus);
          console.log('Loaded menus:', result.menus.length);
        }
      }
    } catch (error) {
      console.error('Load menus error:', error);
      setStatus({ type: 'warning', message: 'Failed to load menus' });
    } finally {
      setLoading(false);
    }
  };

  const searchMenus = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search_term', searchTerm);
      if (searchCategory !== 'ALL') params.append('category', searchCategory);
      
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=search_menus&${params.toString()}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSavedMenus(result.menus);
          setShowSearch(false);
          setStatus({ type: 'success', message: `Found ${result.menus.length} menus` });
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setStatus({ type: 'error', message: 'Search failed' });
    } finally {
      setLoading(false);
    }
  };

  const loadMenuForEdit = async (menuId) => {
    try {
      setLoading(true);
      setStatus({ type: 'loading', message: 'Loading menu data...' });
      
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=get_menu&menu_id=${menuId}`);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.menu) {
          const menu = result.menu;
          
          console.log('Menu loaded:', menu);
          console.log('Ingredients:', result.ingredients);
          
          // Set form values
          setMenuName(menu.nama_menu || '');
          setCategory(menu.kategori || 'MAKANAN');
          setSubcategory(menu.subkategori || 'MAIN_COURSE');
          setBrand(menu.brand || '');
          setTargetCost(menu.target_cost?.toString() || '');
          setTargetQty(menu.target_qty?.toString() || '1');
          setProfitMargin(menu.profit_margin || 40);
          setGofoodPercentage(menu.percentage_gofood || 20);
          setTaxPercentage(menu.percentage_pajak || 10);
          setNotes(menu.catatan || '');
          setCurrentVersion(menu.version || 1);
          
          // Set packaging cost
          setPackaging({
            name: 'Packaging',
            cost: menu.total_packaging?.toString() || '',
            quantity: '1'
          });
          
          // Set ingredients
          if (result.ingredients && result.ingredients.length > 0) {
            const formattedIngredients = result.ingredients.map((ing, index) => ({
              id: index + 1,
              name: ing.nama_bahan || '',
              usage: ing.jumlah_pakai?.toString() || '',
              unit: ing.satuan_pakai || 'GRAM',
              purchase_price: ing.harga_beli?.toString() || '',
              purchase_unit: ing.satuan_beli?.toString() || '1',
              purchase_unit_type: ing.satuan_beli_type || 'GRAM',
              category: ing.kategori_bahan || 'BAHAN_UTAMA',
              supplier: ing.supplier || '',
              notes: ing.catatan_bahan || ''
            }));
            setIngredients(formattedIngredients);
          } else {
            // Default ingredient if none
            setIngredients([{
              id: 1,
              name: '',
              usage: '',
              unit: 'GRAM',
              purchase_price: '',
              purchase_unit: '',
              purchase_unit_type: 'GRAM',
              category: 'BAHAN_UTAMA',
              supplier: '',
              notes: ''
            }]);
          }
          
          setEditMode(true);
          setCurrentMenuId(menuId);
          setActiveTab('hpp');
          setShowMenuList(false);
          
          setStatus({ type: 'success', message: `✅ "${menu.nama_menu}" loaded for editing (v${menu.version || 1})` });
          
        } else {
          setStatus({ type: 'error', message: result.message || 'Failed to load menu' });
        }
      } else {
        setStatus({ type: 'error', message: 'Network error loading menu' });
      }
      
    } catch (error) {
      console.error('Load menu error:', error);
      setStatus({ type: 'error', message: 'Error loading menu: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const deleteMenu = async (menuId, menuName) => {
    if (!window.confirm(`Are you sure you want to delete "${menuName}"?`)) {
      return;
    }
    
    try {
      setLoading(true);
      setStatus({ type: 'loading', message: 'Deleting menu...' });
      
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_menu',
          menu_id: menuId
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          setStatus({ type: 'success', message: `✅ "${menuName}" deleted successfully!` });
          
          // Refresh menu list
          loadMenus();
          
          // Reset form if deleting current menu
          if (editMode && currentMenuId === menuId) {
            resetForm();
          }
        } else {
          setStatus({ type: 'error', message: result.message });
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
      setStatus({ type: 'error', message: 'Delete failed: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // ===== CALCULATION FUNCTIONS =====
  const calculateIngredientCost = (ing) => {
    const usage = parseFloat(ing.usage) || 0;
    const purchaseUnit = parseFloat(ing.purchase_unit) || 1;
    const purchasePrice = parseFloat(ing.purchase_price) || 0;
    return purchaseUnit > 0 ? (usage / purchaseUnit) * purchasePrice : 0;
  };

  const calculateTotalMaterial = () => {
    return ingredients.reduce((total, ing) => total + calculateIngredientCost(ing), 0);
  };

  const calculateTotalProduction = () => {
    return calculateTotalMaterial() + (parseFloat(packaging.cost) || 0);
  };

  const calculateHppPerUnit = () => {
    const total = calculateTotalProduction();
    const qty = parseFloat(targetQty) || 1;
    return qty > 0 ? total / qty : 0;
  };

  const calculateDineInPrice = () => {
    const hpp = calculateHppPerUnit();
    const margin = profitMargin / 100;
    return margin > 0 ? hpp / (1 - margin) : hpp;
  };

  const calculateGofoodPrice = () => {
    const dineInPrice = calculateDineInPrice();
    const gofoodCost = dineInPrice * (gofoodPercentage / 100);
    const taxCost = dineInPrice * (taxPercentage / 100);
    return dineInPrice + gofoodCost + taxCost;
  };

  const calculateGrossProfit = () => {
    return calculateDineInPrice() - calculateHppPerUnit();
  };

  const calculateTotalProfit = () => {
    return calculateGrossProfit() * (parseFloat(targetQty) || 1);
  };

  const calculateTotalRevenue = () => {
    return calculateDineInPrice() * (parseFloat(targetQty) || 1);
  };

  // ===== INGREDIENT MANAGEMENT =====
  const updateIngredient = (id, field, value) => {
    setIngredients(ingredients.map(ingredient =>
      ingredient.id === id ? { ...ingredient, [field]: value } : ingredient
    ));
  };

  const addIngredient = () => {
    const newId = ingredients.length > 0 ? Math.max(...ingredients.map(i => i.id)) + 1 : 1;
    setIngredients([...ingredients, {
      id: newId,
      name: '',
      usage: '',
      unit: 'GRAM',
      purchase_price: '',
      purchase_unit: '',
      purchase_unit_type: 'GRAM',
      category: 'BAHAN_UTAMA',
      supplier: '',
      notes: ''
    }]);
  };

  const removeIngredient = (id) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ingredient => ingredient.id !== id));
    }
  };

  // ===== SAVE & UPDATE FUNCTIONS =====
  const saveOrUpdateMenu = async () => {
    // Validasi
    if (!menuName.trim()) {
      setStatus({ type: 'error', message: '⚠️ Please enter menu name' });
      return;
    }

    const invalidIngredients = ingredients.filter(ing => 
      !ing.name.trim() || !ing.usage || !ing.purchase_price || !ing.purchase_unit
    );
    
    if (invalidIngredients.length > 0) {
      setStatus({ 
        type: 'error', 
        message: `⚠️ Please complete ${invalidIngredients.length} ingredient(s)` 
      });
      return;
    }

    setLoading(true);
    setStatus({ type: 'loading', message: editMode ? 'Updating menu...' : 'Saving menu...' });

    try {
      // Prepare data
      const menuData = {
        action: editMode ? 'update_menu' : 'save_menu',
        menu_id: editMode ? currentMenuId : undefined,
        menu_name: menuName.trim(),
        category: category,
        subcategory: subcategory,
        brand: brand.trim() || '',
        target_cost: parseFloat(targetCost) || 0,
        target_qty: parseFloat(targetQty) || 1,
        total_material: calculateTotalMaterial(),
        packaging_cost: parseFloat(packaging.cost) || 0,
        total_production: calculateTotalProduction(),
        hpp_per_piece: calculateHppPerUnit(),
        profit_margin: profitMargin,
        dine_in_price: calculateDineInPrice(),
        gofood_percentage: gofoodPercentage,
        tax_percentage: taxPercentage,
        gofood_price: calculateGofoodPrice(),
        gross_profit: calculateGrossProfit(),
        total_profit: calculateTotalProfit(),
        total_revenue: calculateTotalRevenue(),
        notes: notes,
        ingredients: ingredients.map(ing => ({
          name: ing.name.trim(),
          usage: ing.usage,
          unit: ing.unit,
          purchase_price: ing.purchase_price,
          purchase_unit: ing.purchase_unit,
          purchase_unit_type: ing.purchase_unit_type,
          category: ing.category,
          supplier: ing.supplier,
          notes: ing.notes
        })),
        packaging: packaging,
        source: 'HPP Calculator App'
      };

      console.log('Sending data:', menuData);

      // Send to Google Apps Script
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(menuData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setStatus({ 
          type: 'success', 
          message: `✅ "${menuName}" ${editMode ? 'updated' : 'saved'} successfully! ${editMode ? `(v${result.version})` : ''}` 
        });
        
        // Refresh menu list
        loadMenus();
        
        // Reset form if not in edit mode
        if (!editMode) {
          setTimeout(() => resetForm(), 2000);
        } else {
          // Update version if editing
          if (result.version) {
            setCurrentVersion(result.version);
          }
        }
        
      } else {
        throw new Error(result.message || 'Save failed');
      }
      
    } catch (error) {
      console.error('Save error:', error);
      setStatus({ 
        type: 'error', 
        message: `${editMode ? 'Update' : 'Save'} failed: ${error.message}` 
      });
      
    } finally {
      setLoading(false);
    }
  };

  // ===== FORM MANAGEMENT =====
  const resetForm = () => {
    setMenuName('');
    setCategory('MAKANAN');
    setSubcategory('MAIN_COURSE');
    setBrand('');
    setTargetCost('');
    setTargetQty('1');
    setProfitMargin(40);
    setGofoodPercentage(20);
    setTaxPercentage(10);
    setNotes('');
    setIngredients([{
      id: 1,
      name: '',
      usage: '',
      unit: 'GRAM',
      purchase_price: '',
      purchase_unit: '',
      purchase_unit_type: 'GRAM',
      category: 'BAHAN_UTAMA',
      supplier: '',
      notes: ''
    }]);
    setPackaging({
      name: 'Packaging',
      cost: '',
      quantity: '1'
    });
    setEditMode(false);
    setCurrentMenuId(null);
    setCurrentVersion(1);
    setStatus({ type: 'info', message: 'Form cleared' });
  };

  const formatRupiah = (number) => {
    if (isNaN(number) || number === 0) return 'Rp 0';
    return `Rp ${Math.round(number).toLocaleString('id-ID')}`;
  };

  // ===== RENDER =====
  return (
    <div className="container-fluid mt-3">
      {/* Header */}
      <div className="header-section text-center mb-4">
        <h1 className="text-primary">📊 HPP Calculator - Full CRUD</h1>
        <p className="text-muted">Load, Edit, Update, Delete menus from Google Sheets</p>
        
        <div className="d-flex justify-content-center align-items-center mb-3 flex-wrap">
          <div className={`badge ${connection === 'connected' ? 'bg-success' : 
                           connection === 'error' ? 'bg-danger' : 'bg-warning'} me-2`}>
            {connection === 'connected' ? '✅ CONNECTED' : 
             connection === 'error' ? '❌ OFFLINE' : '⌛ CHECKING'}
          </div>
          
          <button className="btn btn-sm btn-outline-secondary ms-2" 
            onClick={testConnection} disabled={loading}>
            Test Connection
          </button>
          
          <button className="btn btn-sm btn-outline-primary ms-2"
            onClick={() => setShowMenuList(!showMenuList)}>
            {showMenuList ? 'Hide' : 'Show'} Menus ({savedMenus.length})
          </button>
          
          <button className="btn btn-sm btn-outline-info ms-2"
            onClick={() => setShowSearch(!showSearch)}>
            Search
          </button>
          
          <button className="btn btn-sm btn-outline-warning ms-2"
            onClick={initializeSheets} disabled={loading}>
            Initialize Sheets
          </button>
          
          {editMode && (
            <button className="btn btn-sm btn-outline-danger ms-2"
              onClick={resetForm}>
              Cancel Edit
            </button>
          )}
        </div>

        {status.message && (
          <div className={`alert ${status.type === 'success' ? 'alert-success' : 
                           status.type === 'error' ? 'alert-danger' : 
                           status.type === 'loading' ? 'alert-info' : 
                           'alert-warning'} alert-dismissible fade show`}>
            <div className="d-flex justify-content-between align-items-center">
              <div>{status.message}</div>
              <button type="button" className="btn-close" 
                onClick={() => setStatus({ type: '', message: '' })}></button>
            </div>
          </div>
        )}
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title">Search Menus</h5>
                <button type="button" className="btn-close btn-close-white"
                  onClick={() => setShowSearch(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Search Term</label>
                  <input type="text" className="form-control"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by menu name or brand..." />
                </div>
                <div className="mb-3">
                  <label className="form-label">Category</label>
                  <select className="form-select"
                    value={searchCategory}
                    onChange={(e) => setSearchCategory(e.target.value)}>
                    <option value="ALL">All Categories</option>
                    <option value="MAKANAN">Food</option>
                    <option value="MINUMAN">Drink</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowSearch(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary"
                  onClick={searchMenus} disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu List Modal */}
      {showMenuList && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Saved Menus ({savedMenus.length})</h5>
                <button type="button" className="btn-close btn-close-white"
                  onClick={() => setShowMenuList(false)}></button>
              </div>
              <div className="modal-body">
                {savedMenus.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover table-sm">
                      <thead>
                        <tr>
                          <th>Menu ID</th>
                          <th>Menu Name</th>
                          <th>Category</th>
                          <th>Brand</th>
                          <th>HPP/Unit</th>
                          <th>Dine In Price</th>
                          <th>Version</th>
                          <th>Last Updated</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {savedMenus.map((menu, index) => (
                          <tr key={index}>
                            <td>
                              <small className="text-muted">{menu.menu_id}</small>
                            </td>
                            <td>
                              <strong>{menu.nama_menu}</strong>
                              {menu.catatan && (
                                <div><small className="text-muted">{menu.catatan}</small></div>
                              )}
                            </td>
                            <td>
                              <span className="badge bg-info">
                                {menu.kategori}
                              </span>
                              <div><small>{menu.subkategori}</small></div>
                            </td>
                            <td>{menu.brand || '-'}</td>
                            <td className="text-success">
                              {formatRupiah(menu.hpp_per_unit || 0)}
                            </td>
                            <td className="text-primary">
                              {formatRupiah(menu.harga_dine_in || 0)}
                            </td>
                            <td>
                              <span className="badge bg-secondary">v{menu.version || 1}</span>
                            </td>
                            <td>
                              <small>{menu.updated_at || menu.created_at}</small>
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <button className="btn btn-warning"
                                  onClick={() => loadMenuForEdit(menu.menu_id)}
                                  disabled={loading}>
                                  <i className="bi bi-pencil"></i> Edit
                                </button>
                                <button className="btn btn-outline-danger"
                                  onClick={() => deleteMenu(menu.menu_id, menu.nama_menu)}
                                  disabled={loading}>
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted">No menus found</p>
                    <button className="btn btn-primary" onClick={loadMenus}>
                      Load Menus
                    </button>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowMenuList(false)}>
                  Close
                </button>
                <button type="button" className="btn btn-outline-primary"
                  onClick={loadMenus} disabled={loading}>
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="row">
        {/* Left Column - Form */}
        <div className="col-lg-8">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">
                  {editMode ? `✏️ Edit Menu: ${menuName}` : '📝 New Menu'}
                  {editMode && <span className="badge bg-warning ms-2">v{currentVersion}</span>}
                </h5>
              </div>
              <div>
                {editMode && (
                  <span className="badge bg-info me-2">ID: {currentMenuId}</span>
                )}
              </div>
            </div>
            
            <div className="card-body">
              {/* Tabs */}
              <ul className="nav nav-tabs mb-3">
                <li className="nav-item">
                  <button className={`nav-link ${activeTab === 'hpp' ? 'active' : ''}`}
                    onClick={() => setActiveTab('hpp')}>
                    📈 HPP Calculation
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link ${activeTab === 'resep' ? 'active' : ''}`}
                    onClick={() => setActiveTab('resep')}>
                    🥘 Recipe Details
                  </button>
                </li>
              </ul>
              
              {/* HPP Tab */}
              {activeTab === 'hpp' && (
                <div className="hpp-form">
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Menu Name *</label>
                      <input type="text" className="form-control" 
                        value={menuName} onChange={(e) => setMenuName(e.target.value)}
                        placeholder="e.g., Spaghetti Carbonara" disabled={loading} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Category</label>
                      <select className="form-select" value={category}
                        onChange={(e) => setCategory(e.target.value)} disabled={loading}>
                        <option value="MAKANAN">Food</option>
                        <option value="MINUMAN">Drink</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Subcategory</label>
                      <select className="form-select" value={subcategory}
                        onChange={(e) => setSubcategory(e.target.value)} disabled={loading}>
                        {CATEGORIES[category]?.map(sub => (
                          <option key={sub} value={sub}>{sub.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Brand / Product Line</label>
                      <input type="text" className="form-control" 
                        value={brand} onChange={(e) => setBrand(e.target.value)}
                        placeholder="e.g., Signature Dishes" disabled={loading} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Target Cost</label>
                      <div className="input-group">
                        <span className="input-group-text">Rp</span>
                        <input type="number" className="form-control" 
                          value={targetCost} onChange={(e) => setTargetCost(e.target.value)}
                          placeholder="25000" disabled={loading} />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Production Qty</label>
                      <input type="number" className="form-control" 
                        value={targetQty} onChange={(e) => setTargetQty(e.target.value)}
                        placeholder="4" min="1" disabled={loading} />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="form-label">Profit Margin (%)</label>
                      <div className="input-group">
                        <input type="number" className="form-control" 
                          value={profitMargin} onChange={(e) => setProfitMargin(e.target.value)}
                          min="0" max="100" disabled={loading} />
                        <span className="input-group-text">%</span>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">GoFood Fee (%)</label>
                      <div className="input-group">
                        <input type="number" className="form-control" 
                          value={gofoodPercentage} onChange={(e) => setGofoodPercentage(e.target.value)}
                          min="0" max="100" disabled={loading} />
                        <span className="input-group-text">%</span>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Tax (%)</label>
                      <div className="input-group">
                        <input type="number" className="form-control" 
                          value={taxPercentage} onChange={(e) => setTaxPercentage(e.target.value)}
                          min="0" max="100" disabled={loading} />
                        <span className="input-group-text">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" rows="2" value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes about this menu..."
                      disabled={loading} />
                  </div>
                </div>
              )}

              {/* Recipe Tab */}
              {activeTab === 'resep' && (
                <div className="resep-form">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5>Ingredients ({ingredients.length})</h5>
                    <button className="btn btn-sm btn-success" 
                      onClick={addIngredient} disabled={loading}>
                      + Add Ingredient
                    </button>
                  </div>

                  {ingredients.map((ingredient, index) => (
                    <div key={ingredient.id} className="ingredient-card mb-3 p-3 border rounded">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0">
                          <span className="badge bg-secondary me-2">{index + 1}</span>
                          {ingredient.name || 'New Ingredient'}
                        </h6>
                        {ingredients.length > 1 && (
                          <button className="btn btn-sm btn-outline-danger"
                            onClick={() => removeIngredient(ingredient.id)} 
                            disabled={loading}>
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="row g-2">
                        <div className="col-md-3">
                          <label className="form-label small">Ingredient Name *</label>
                          <input type="text" className="form-control form-control-sm"
                            value={ingredient.name}
                            onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)}
                            disabled={loading} />
                        </div>
                        
                        <div className="col-md-2">
                          <label className="form-label small">Usage Amount *</label>
                          <input type="number" className="form-control form-control-sm"
                            value={ingredient.usage}
                            onChange={(e) => updateIngredient(ingredient.id, 'usage', e.target.value)}
                            disabled={loading} />
                        </div>
                        
                        <div className="col-md-2">
                          <label className="form-label small">Unit</label>
                          <select className="form-select form-control-sm"
                            value={ingredient.unit}
                            onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
                            disabled={loading}>
                            <option value="GRAM">Gram</option>
                            <option value="ML">ML</option>
                            <option value="PCS">Pcs</option>
                            <option value="KG">Kg</option>
                            <option value="LITER">Liter</option>
                          </select>
                        </div>
                        
                        <div className="col-md-3">
                          <label className="form-label small">Purchase Price *</label>
                          <div className="input-group input-group-sm">
                            <span className="input-group-text">Rp</span>
                            <input type="number" className="form-control"
                              value={ingredient.purchase_price}
                              onChange={(e) => updateIngredient(ingredient.id, 'purchase_price', e.target.value)}
                              disabled={loading} />
                          </div>
                        </div>
                        
                        <div className="col-md-2">
                          <label className="form-label small">Purchase Unit *</label>
                          <input type="number" className="form-control form-control-sm"
                            value={ingredient.purchase_unit}
                            onChange={(e) => updateIngredient(ingredient.id, 'purchase_unit', e.target.value)}
                            disabled={loading} />
                        </div>
                      </div>

                      <div className="row g-2 mt-2">
                        <div className="col-md-3">
                          <label className="form-label small">Category</label>
                          <select className="form-select form-control-sm"
                            value={ingredient.category}
                            onChange={(e) => updateIngredient(ingredient.id, 'category', e.target.value)}
                            disabled={loading}>
                            <option value="BAHAN_UTAMA">Main Ingredient</option>
                            <option value="BAHAN_TAMBAHAN">Additional</option>
                            <option value="BUMBU">Seasoning</option>
                            <option value="KEMASAN">Packaging</option>
                          </select>
                        </div>
                        
                        <div className="col-md-4">
                          <label className="form-label small">Supplier</label>
                          <input type="text" className="form-control form-control-sm"
                            value={ingredient.supplier}
                            onChange={(e) => updateIngredient(ingredient.id, 'supplier', e.target.value)}
                            disabled={loading} />
                        </div>
                        
                        <div className="col-md-5">
                          <label className="form-label small">Notes</label>
                          <input type="text" className="form-control form-control-sm"
                            value={ingredient.notes}
                            onChange={(e) => updateIngredient(ingredient.id, 'notes', e.target.value)}
                            disabled={loading} />
                        </div>
                      </div>

                      <div className="mt-2">
                        <small className="text-success">
                          Cost: <strong>{formatRupiah(calculateIngredientCost(ingredient))}</strong>
                        </small>
                      </div>
                    </div>
                  ))}

                  {/* Packaging Section */}
                  <div className="mt-4 p-3 border rounded bg-light">
                    <h6>📦 Packaging Cost</h6>
                    <div className="row g-2">
                      <div className="col-md-4">
                        <label className="form-label small">Packaging Name</label>
                        <input type="text" className="form-control form-control-sm"
                          value={packaging.name}
                          onChange={(e) => setPackaging({...packaging, name: e.target.value})}
                          disabled={loading} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small">Total Cost</label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text">Rp</span>
                          <input type="number" className="form-control"
                            value={packaging.cost}
                            onChange={(e) => setPackaging({...packaging, cost: e.target.value})}
                            disabled={loading} />
                        </div>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small">Quantity</label>
                          <input type="number" className="form-control form-control-sm"
                            value={packaging.quantity}
                            onChange={(e) => setPackaging({...packaging, quantity: e.target.value})}
                            disabled={loading} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <small className="text-muted">
                      Total Ingredients Cost: <strong>{formatRupiah(calculateTotalMaterial())}</strong>
                      <span className="ms-3">Total Packaging: <strong>{formatRupiah(parseFloat(packaging.cost) || 0)}</strong></span>
                    </small>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-4">
                <button className={`btn ${editMode ? 'btn-warning' : 'btn-success'} btn-lg w-100`}
                  onClick={saveOrUpdateMenu}
                  disabled={loading || !menuName.trim()}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      {editMode ? 'Updating...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <i className={`bi ${editMode ? 'bi-arrow-clockwise' : 'bi-save'} me-2`}></i>
                      {editMode ? 'Update Menu' : 'Save Menu to Google Sheets'}
                    </>
                  )}
                </button>
                
                <div className="d-flex gap-2 mt-2">
                  <button className="btn btn-outline-secondary flex-grow-1"
                    onClick={resetForm}
                    disabled={loading}>
                    {editMode ? 'Cancel Edit' : 'Clear Form'}
                  </button>
                  
                  <button className="btn btn-outline-primary flex-grow-1"
                    onClick={() => setActiveTab(activeTab === 'hpp' ? 'resep' : 'hpp')}
                    disabled={loading}>
                    {activeTab === 'hpp' ? 'Go to Recipe Details' : 'Go to HPP Calculation'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Results & Summary */}
        <div className="col-lg-4">
          {/* Cost Summary */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">📊 Cost Summary</h5>
            </div>
            <div className="card-body">
              <div className="summary-item mb-3">
                <div className="d-flex justify-content-between">
                  <span>Total Ingredients:</span>
                  <strong className="text-success">{formatRupiah(calculateTotalMaterial())}</strong>
                </div>
                <small className="text-muted">{ingredients.length} items</small>
              </div>
              
              <div className="summary-item mb-3">
                <div className="d-flex justify-content-between">
                  <span>Packaging:</span>
                  <strong className="text-warning">{formatRupiah(parseFloat(packaging.cost) || 0)}</strong>
                </div>
              </div>
              
              <div className="summary-item mb-3 p-2 bg-light rounded">
                <div className="d-flex justify-content-between">
                  <span>Total Production Cost:</span>
                  <strong className="text-primary">{formatRupiah(calculateTotalProduction())}</strong>
                </div>
                <small className="text-muted">For {targetQty} units</small>
              </div>
              
              <hr />
              
              <div className="result-box p-3 bg-success text-white rounded mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">HPP per Unit:</h6>
                  <h4 className="mb-0">{formatRupiah(calculateHppPerUnit())}</h4>
                </div>
                <small>Cost per serving</small>
              </div>
              
              <div className="result-box p-3 bg-light rounded">
                <div className="d-flex justify-content-between mb-2">
                  <span>Dine In Price:</span>
                  <strong className="text-primary">{formatRupiah(calculateDineInPrice())}</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>GoFood Price:</span>
                  <strong className="text-danger">{formatRupiah(calculateGofoodPrice())}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Gross Profit/Unit:</span>
                  <strong className="text-success">{formatRupiah(calculateGrossProfit())}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card shadow-sm">
            <div className="card-header bg-purple text-white">
              <h5 className="mb-0">⚡ Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <button className="btn btn-outline-primary"
                  onClick={() => setShowMenuList(true)}
                  disabled={loading}>
                  <i className="bi bi-list me-2"></i>
                  Browse Saved Menus
                </button>
                
                <button className="btn btn-outline-info"
                  onClick={loadMenus}
                  disabled={loading}>
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Refresh Menu List
                </button>
                
                <button className="btn btn-outline-warning"
                  onClick={() => {
                    if (savedMenus.length > 0) {
                      loadMenuForEdit(savedMenus[0].menu_id);
                    }
                  }}
                  disabled={loading || savedMenus.length === 0}>
                  <i className="bi bi-pencil me-2"></i>
                  Edit Latest Menu
                </button>
              </div>
              
              <div className="mt-3">
                <small className="text-muted">
                  <strong>Connection:</strong> {connection}<br />
                  <strong>Total Menus:</strong> {savedMenus.length}<br />
                  <strong>Mode:</strong> {editMode ? `Editing (v${currentVersion})` : 'Creating New'}<br />
                  <strong>Sheets:</strong> 4 Sheets
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-4 mb-3 text-center">
        <p className="small text-muted">
          HPP Calculator v3.0 | Full CRUD Operations | Google Sheets Integration
        </p>
      </footer>
    </div>
  );
};

export default App;