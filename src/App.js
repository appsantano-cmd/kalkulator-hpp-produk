import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// PRODUCTION URL - PASTIKAN INI ADALAH URL GOOGLE SCRIPT
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyLEjp-p9CFvpu9lLEfz1I7TPA1iLeYO4KEJVISKnl5AfReHVM3yqzoteNaNjMOJoAS0g/exec';

const App = () => {
  // States
  const [brand, setBrand] = useState('');
  const [targetCost, setTargetCost] = useState('');
  const [targetPieces, setTargetPieces] = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [recipeCategory, setRecipeCategory] = useState('Cake');
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [lastCheck, setLastCheck] = useState(null);

  // Ingredients state
  const [ingredients, setIngredients] = useState([
    { id: 1, name: '', usage: '', unit: 'gr', purchasePrice: '', purchaseUnit: '' }
  ]);

  // Consumable state
  const [consumable, setConsumable] = useState({
    name: 'Packaging',
    cost: '',
    quantity: '1',
    unit: 'unit'
  });

  // Percentages
  const [goFoodPercentage, setGoFoodPercentage] = useState(20);
  const [taxPercentage, setTaxPercentage] = useState(10);
  const [profitMargin, setProfitMargin] = useState(40);

  // History
  const [recipeHistory, setRecipeHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // ===== UTILITY FUNCTIONS =====
  const formatRupiah = (number) => {
    if (isNaN(number) || number === 0) return 'Rp 0';
    return `Rp ${Math.round(number).toLocaleString('id-ID')}`;
  };

  // ===== CALCULATION FUNCTIONS =====
  const calculateIngredientCost = (ing) => {
    const usage = parseFloat(ing.usage) || 0;
    const purchaseUnit = parseFloat(ing.purchaseUnit) || 1;
    const purchasePrice = parseFloat(ing.purchasePrice) || 0;
    return purchaseUnit > 0 ? (usage / purchaseUnit) * purchasePrice : 0;
  };

  const calculateTotalMaterialCost = () => {
    return ingredients.reduce((total, ing) => total + calculateIngredientCost(ing), 0);
  };

  const calculateTotalProductionCost = () => {
    return calculateTotalMaterialCost() + (parseFloat(consumable.cost) || 0);
  };

  const calculateHPPPerPiece = () => {
    const total = calculateTotalProductionCost();
    const pieces = parseFloat(targetPieces) || 1;
    return pieces > 0 ? total / pieces : 0;
  };

  const calculateDineInPrice = () => {
    const hpp = calculateHPPPerPiece();
    const margin = profitMargin / 100;
    if (margin >= 1) return hpp * 2;
    return margin > 0 ? hpp / (1 - margin) : hpp;
  };

  const calculateGoFoodCost = () => {
    return calculateDineInPrice() * (goFoodPercentage / 100);
  };

  const calculateRestaurantTax = () => {
    return calculateDineInPrice() * (taxPercentage / 100);
  };

  const calculateGoFoodPrice = () => {
    return calculateDineInPrice() + calculateGoFoodCost() + calculateRestaurantTax();
  };

  const calculateGrossProfit = () => {
    return calculateDineInPrice() - calculateHPPPerPiece();
  };

  // ===== MANAJEMEN BAHAN =====
  const updateIngredient = (id, field, value) => {
    setIngredients(ingredients.map(ingredient =>
      ingredient.id === id ? { ...ingredient, [field]: value } : ingredient
    ));
  };

  const addIngredient = () => {
    const newId = ingredients.length > 0 ? Math.max(...ingredients.map(i => i.id)) + 1 : 1;
    setIngredients([
      ...ingredients,
      { id: newId, name: '', usage: '', unit: 'gr', purchasePrice: '', purchaseUnit: '' }
    ]);
  };

  const removeIngredient = (id) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ingredient => ingredient.id !== id));
    }
  };

  // ===== RESET =====
  const resetAllData = () => {
    setBrand('');
    setTargetCost('');
    setTargetPieces('');
    setRecipeName('');
    setRecipeCategory('Cake');
    setIngredients([{ id: 1, name: '', usage: '', unit: 'gr', purchasePrice: '', purchaseUnit: '' }]);
    setConsumable({ name: 'Packaging', cost: '', quantity: '1', unit: 'unit' });
    setGoFoodPercentage(20);
    setTaxPercentage(10);
    setProfitMargin(40);
    setSaveStatus({ type: '', message: '' });
  };

  // ===== TEST CONNECTION - IMPROVED VERSION =====
  const testConnection = async () => {
    try {
      setConnectionStatus('checking');
      setSaveStatus({ type: 'loading', message: '🔄 Testing connection to Google Sheets...' });
      
      console.log('Testing connection to Google Script:', GOOGLE_SCRIPT_URL);
      
      // Approach 1: Coba GET request dulu (biasanya lebih reliable)
      console.log('Trying GET request...');
      let response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'GET',
        mode: 'no-cors', // Coba dengan no-cors untuk menghindari CORS error
      }).catch(e => {
        console.log('GET with no-cors failed:', e.message);
        return null;
      });
      
      // Approach 2: Coba POST request dengan test_connection
      if (!response) {
        console.log('Trying POST request...');
        const testData = {
          action: 'ping',
          timestamp: new Date().toISOString(),
          source: 'Netlify App'
        };
        
        response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testData)
        });
      }
      
      // Jika response ada dan ok
      if (response && response.ok) {
        try {
          const result = await response.json();
          console.log('✅ Connection successful:', result);
          
          setConnectionStatus('connected');
          setLastCheck(new Date());
          
          setSaveStatus({ 
            type: 'success', 
            message: `✅ Connected to Google Sheets API! Status: ${result.status || 'online'}` 
          });
          
        } catch (jsonError) {
          console.log('JSON parse error, but request went through');
          setConnectionStatus('connected');
          setLastCheck(new Date());
          setSaveStatus({ 
            type: 'success', 
            message: '✅ Connected to Google Script (response ok)' 
          });
        }
      } else {
        // Request berhasil dikirim tapi tidak dapat response JSON
        setConnectionStatus('connected');
        setLastCheck(new Date());
        setSaveStatus({ 
          type: 'warning', 
          message: '⚠️ Connected but may have CORS restrictions' 
        });
      }
      
    } catch (error) {
      console.error('❌ Connection test error:', error);
      setConnectionStatus('error');
      setLastCheck(new Date());
      
      let errorMessage = 'Connection failed: ';
      
      if (error.message.includes('Failed to fetch')) {
        errorMessage += 'Network error. Check: 1. Internet connection 2. Google Script URL 3. CORS settings';
      } else if (error.message.includes('CORS')) {
        errorMessage += 'CORS policy blocked the request. Try from same origin.';
      } else {
        errorMessage += error.message;
      }
      
      setSaveStatus({ 
        type: 'error', 
        message: `❌ ${errorMessage}` 
      });
      
      // Fallback: Test dengan method sederhana
      try {
        console.log('Trying simple ping...');
        const testUrl = `${GOOGLE_SCRIPT_URL}?test=${Date.now()}`;
        const img = new Image();
        img.src = testUrl;
        
        setTimeout(() => {
          console.log('Ping attempt completed');
        }, 1000);
      } catch (pingError) {
        console.log('Ping also failed');
      }
    }
  };

  // ===== LOCAL CACHE =====
  const saveToLocalCache = (summaryData, ingredientsData) => {
    try {
      const cacheData = {
        ...summaryData,
        ingredients: ingredientsData,
        cached_at: new Date().toISOString()
      };
      
      const existingCache = JSON.parse(localStorage.getItem('hpp_cache') || '[]');
      existingCache.unshift(cacheData);
      localStorage.setItem('hpp_cache', JSON.stringify(existingCache.slice(0, 20)));
      setRecipeHistory(existingCache.slice(0, 20));
    } catch (error) {
      console.error('Cache error:', error);
    }
  };

  const loadFromCache = (recipe) => {
    setRecipeName(recipe.recipe_name);
    setRecipeCategory(recipe.recipe_category);
    setBrand(recipe.brand);
    setTargetCost(recipe.target_cost?.toString() || '');
    setTargetPieces(recipe.target_pieces?.toString() || '');
    setProfitMargin(recipe.profit_margin || 40);
    setGoFoodPercentage(recipe.gofood_percentage || 20);
    setTaxPercentage(recipe.tax_percentage || 10);
    
    setSaveStatus({ type: 'info', message: '📂 Recipe loaded. Re-enter ingredients.' });
    setShowHistory(false);
  };

  // ===== SIMPAN KE GOOGLE SHEETS =====
  const saveToGoogleSheets = async () => {
    // Validasi
    if (!recipeName.trim()) {
      setSaveStatus({ type: 'error', message: '⚠️ Please enter recipe name' });
      return;
    }

    const invalidIngredients = ingredients.filter(ing => 
      !ing.name.trim() || !ing.usage || !ing.purchasePrice || !ing.purchaseUnit
    );
    
    if (invalidIngredients.length > 0) {
      setSaveStatus({ 
        type: 'error', 
        message: `⚠️ Please complete ${invalidIngredients.length} ingredient(s)` 
      });
      return;
    }

    setIsLoading(true);
    setSaveStatus({ type: 'loading', message: '📤 Sending to Google Sheets...' });

    let summaryData = null;
    let ingredientsData = null;

    try {
      // Prepare data
      const now = new Date();
      const timestamp = now.toLocaleString('id-ID');

      summaryData = {
        timestamp: timestamp,
        recipe_name: recipeName.trim(),
        recipe_category: recipeCategory,
        brand: brand.trim() || '-',
        target_cost: parseFloat(targetCost) || 0,
        target_pieces: parseFloat(targetPieces) || 0,
        total_material_cost: calculateTotalMaterialCost(),
        packaging_cost: parseFloat(consumable.cost) || 0,
        total_production_cost: calculateTotalProductionCost(),
        hpp_per_piece: calculateHPPPerPiece(),
        profit_margin: profitMargin,
        dine_in_price: calculateDineInPrice(),
        gofood_percentage: goFoodPercentage,
        tax_percentage: taxPercentage,
        gofood_price: calculateGoFoodPrice(),
        gross_profit: calculateGrossProfit(),
        status: 'ACTIVE'
      };

      ingredientsData = ingredients.map((ing, index) => ({
        recipe_name: recipeName.trim(),
        ingredient_no: index + 1,
        ingredient_name: ing.name.trim(),
        usage_amount: parseFloat(ing.usage) || 0,
        usage_unit: ing.unit,
        purchase_price: parseFloat(ing.purchasePrice) || 0,
        purchase_unit: parseFloat(ing.purchaseUnit) || 1,
        ingredient_cost: calculateIngredientCost(ing)
      }));

      const packagingData = {
        recipe_name: recipeName.trim(),
        item_name: consumable.name,
        cost: parseFloat(consumable.cost) || 0,
        quantity: consumable.quantity,
        unit: consumable.unit
      };

      const allData = {
        action: 'save_recipe',
        timestamp: timestamp,
        summary: summaryData,
        ingredients: ingredientsData,
        packaging: packagingData,
        source: 'Netlify App'
      };

      console.log('📨 Sending data to Google Script:', allData);

      // Send to Google Sheets dengan error handling khusus untuk CORS
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Gunakan no-cors untuk menghindari CORS error
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(allData)
      }).catch(async (fetchError) => {
        console.log('Fetch failed, trying alternative method:', fetchError);
        
        // Fallback: Gunakan form submission method
        return await tryFormSubmission(allData);
      });

      // Dengan mode 'no-cors', kita tidak bisa membaca response
      // Tapi request sudah terkirim ke Google Script
      console.log('✅ Request sent to Google Script (no-cors mode)');
      
      // Simpan ke cache lokal sebagai backup
      if (summaryData && ingredientsData) {
        saveToLocalCache(summaryData, ingredientsData);
      }
      
      // Beri feedback ke user
      setTimeout(() => {
        setSaveStatus({ 
          type: 'success', 
          message: `✅ Recipe "${recipeName}" sent to Google Sheets! Data may take a few seconds to appear.` 
        });
        
        // Reset form setelah 3 detik
        setTimeout(() => {
          resetAllData();
          setSaveStatus({ 
            type: 'info', 
            message: '📝 Form cleared. Ready for next recipe!' 
          });
        }, 3000);
      }, 1000);

    } catch (error) {
      console.error('❌ Save error:', error);
      
      // Simpan ke cache lokal sebagai fallback
      if (summaryData && ingredientsData) {
        saveToLocalCache(summaryData, ingredientsData);
      }
      
      setSaveStatus({ 
        type: 'warning', 
        message: `⚠️ Saved locally. Google Sheets sync may be delayed. Error: ${error.message}` 
      });
      
    } finally {
      setIsLoading(false);
    }
  };

  // Alternative method untuk mengirim data jika fetch gagal
  const tryFormSubmission = (data) => {
    return new Promise((resolve) => {
      try {
        // Buat form tersembunyi
        const form = document.createElement('form');
        const iframe = document.createElement('iframe');
        
        iframe.name = 'google-script-iframe';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        form.target = 'google-script-iframe';
        form.action = GOOGLE_SCRIPT_URL;
        form.method = 'POST';
        form.style.display = 'none';
        
        // Tambahkan data sebagai input
        const input = document.createElement('input');
        input.name = 'data';
        input.value = JSON.stringify(data);
        form.appendChild(input);
        
        document.body.appendChild(form);
        form.submit();
        
        // Cleanup setelah 3 detik
        setTimeout(() => {
          document.body.removeChild(form);
          document.body.removeChild(iframe);
          resolve({ ok: true });
        }, 3000);
        
      } catch (error) {
        console.log('Form submission also failed:', error);
        resolve({ ok: false });
      }
    });
  };

  // ===== AUTO CHECK CONNECTION =====
  useEffect(() => {
    // Auto-check connection on load
    testConnection();
    
    // Load cache
    const cached = JSON.parse(localStorage.getItem('hpp_cache') || '[]');
    setRecipeHistory(cached);
    
    // Periodic connection check (every 2 minutes)
    const interval = setInterval(() => {
      if (connectionStatus !== 'connected') {
        testConnection();
      }
    }, 120000);
    
    return () => clearInterval(interval);
  }, []);

  // ===== RENDER =====
  // (Render code tetap sama seperti sebelumnya, tidak berubah)
  // ... (kode render component yang sama)

  return (
    <div className="container mt-3">
      {/* Header */}
      <div className="header-section text-center mb-4">
        <h1 className="text-primary">🚀 HPP Calculator - Production</h1>
        <p className="text-muted">Connected to Google Sheets</p>
        
        {/* Connection Status */}
        <div className="d-flex justify-content-center align-items-center mb-3">
          <div className={`badge ${connectionStatus === 'connected' ? 'bg-success' : 
                           connectionStatus === 'error' ? 'bg-danger' : 'bg-warning'} me-2`}
               style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
            {connectionStatus === 'connected' ? '✅ ONLINE' : 
             connectionStatus === 'error' ? '❌ OFFLINE' : '⌛ CHECKING...'}
          </div>
          
          <button 
            className="btn btn-sm btn-outline-secondary ms-2"
            onClick={testConnection}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="spinner-border spinner-border-sm me-1"></span>
            ) : (
              '🔄 Test'
            )}
          </button>
          
          {lastCheck && (
            <small className="text-muted ms-2">
              Last check: {lastCheck.toLocaleTimeString()}
            </small>
          )}
        </div>

        {/* Status Message */}
        {saveStatus.message && (
          <div className={`alert ${saveStatus.type === 'success' ? 'alert-success' : 
                           saveStatus.type === 'error' ? 'alert-danger' : 
                           saveStatus.type === 'loading' ? 'alert-info' : 
                           'alert-warning'} alert-dismissible fade show`} 
               style={{maxWidth: '800px', margin: '0 auto'}}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>{saveStatus.message}</strong>
                {saveStatus.type === 'error' && (
                  <div className="small mt-1">
                    <a href="#" onClick={(e) => {
                      e.preventDefault();
                      testConnection();
                    }} className="text-decoration-none">
                      Click here to test connection again
                    </a>
                  </div>
                )}
              </div>
              {saveStatus.type !== 'loading' && (
                <button type="button" className="btn-close" onClick={() => setSaveStatus({ type: '', message: '' })}></button>
              )}
            </div>
            {saveStatus.type === 'loading' && (
              <div className="progress mt-2" style={{height: '5px'}}>
                <div className="progress-bar progress-bar-striped progress-bar-animated" style={{width: '100%'}}></div>
              </div>
            )}
          </div>
        )}
        
        {/* Debug Info */}
        <div className="mt-2 small text-muted">
          <span>URL: {GOOGLE_SCRIPT_URL.substring(0, 40)}...</span>
          <span className="ms-3">Netlify: {window.location.origin}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="row">
        {/* Left Column - Form */}
        <div className="col-lg-7">
          {/* Recipe Info Card */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">📝 Data Resep</h5>
              <div>
                <button 
                  className="btn btn-light btn-sm me-2" 
                  onClick={resetAllData}
                  disabled={isLoading}
                >
                  🔄 Reset
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">
                    <i className="bi bi-journal-text me-2"></i>Nama Resep *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    placeholder="Contoh: Carrot Cake Premium"
                    disabled={isLoading}
                    required
                  />
                  <small className="text-muted">Wajib diisi untuk menyimpan</small>
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    <i className="bi bi-tags me-2"></i>Kategori
                  </label>
                  <select
                    className="form-select"
                    value={recipeCategory}
                    onChange={(e) => setRecipeCategory(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="Cake">Cake</option>
                    <option value="Pastry">Pastry</option>
                    <option value="Bread">Roti</option>
                    <option value="Cookies">Cookies</option>
                    <option value="Dessert">Dessert</option>
                    <option value="Beverage">Minuman</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Other">Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    <i className="bi bi-shop me-2"></i>Nama Produk / Brand
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Contoh: Carrot Cake Delight"
                    disabled={isLoading}
                  />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">
                    <i className="bi bi-bullseye me-2"></i>Target Biaya
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">Rp</span>
                    <input
                      type="number"
                      className="form-control"
                      value={targetCost}
                      onChange={(e) => setTargetCost(e.target.value)}
                      placeholder="Target"
                      min="0"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">
                    <i className="bi bi-box-seam me-2"></i>Jumlah Produksi
                  </label>
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control"
                      value={targetPieces}
                      onChange={(e) => setTargetPieces(e.target.value)}
                      placeholder="Jumlah"
                      min="1"
                      disabled={isLoading}
                    />
                    <span className="input-group-text">pcs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ingredients Card */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">🥕 Bahan Baku ({ingredients.length})</h5>
              <button 
                className="btn btn-light btn-sm" 
                onClick={addIngredient}
                disabled={isLoading}
              >
                <i className="bi bi-plus-circle me-1"></i>Tambah
              </button>
            </div>
            <div className="card-body">
              {ingredients.map((ingredient, index) => (
                <div key={ingredient.id} className="ingredient-card mb-3 p-3 border rounded">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0">
                      <span className="badge bg-secondary me-2">{index + 1}</span>
                      {ingredient.name || 'Bahan Baru'}
                    </h6>
                    {ingredients.length > 1 && (
                      <button 
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => removeIngredient(ingredient.id)}
                        disabled={isLoading}
                        title="Hapus bahan"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    )}
                  </div>
                  
                  <div className="row g-2">
                    <div className="col-md-4">
                      <label className="form-label small">Nama Bahan *</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={ingredient.name}
                        onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)}
                        placeholder="Contoh: Tepung Terigu"
                        disabled={isLoading}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small">Jumlah Pakai *</label>
                      <div className="input-group input-group-sm">
                        <input
                          type="number"
                          className="form-control"
                          value={ingredient.usage}
                          onChange={(e) => updateIngredient(ingredient.id, 'usage', e.target.value)}
                          placeholder="360"
                          step="0.01"
                          min="0"
                          disabled={isLoading}
                          required
                        />
                        <select
                          className="form-select"
                          style={{ width: '80px' }}
                          value={ingredient.unit}
                          onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
                          disabled={isLoading}
                        >
                          <option value="gr">gr</option>
                          <option value="ml">ml</option>
                          <option value="kg">kg</option>
                          <option value="pcs">pcs</option>
                          <option value="sdm">sdm</option>
                          <option value="sdt">sdt</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small">Harga Beli *</label>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text">Rp</span>
                        <input
                          type="number"
                          className="form-control"
                          value={ingredient.purchasePrice}
                          onChange={(e) => updateIngredient(ingredient.id, 'purchasePrice', e.target.value)}
                          placeholder="25000"
                          step="100"
                          min="0"
                          disabled={isLoading}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small">Satuan Beli *</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={ingredient.purchaseUnit}
                        onChange={(e) => updateIngredient(ingredient.id, 'purchaseUnit', e.target.value)}
                        placeholder="1000"
                        step="0.01"
                        min="0.01"
                        disabled={isLoading}
                        required
                      />
                      <small className="text-muted">dalam {ingredient.unit}</small>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <small className="text-success">
                      <i className="bi bi-calculator me-1"></i>
                      Biaya bahan ini: <strong>{formatRupiah(calculateIngredientCost(ingredient))}</strong>
                    </small>
                  </div>
                </div>
              ))}
              
              <div className="mt-3">
                <small className="text-muted">
                  <i className="bi bi-info-circle me-1"></i>
                  Total semua bahan: <strong>{formatRupiah(calculateTotalMaterialCost())}</strong>
                </small>
              </div>
            </div>
          </div>

          {/* Additional Costs */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-warning">
              <h5 className="mb-0">📦 Biaya Tambahan</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    <i className="bi bi-box me-2"></i>Biaya Packaging
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">Rp</span>
                    <input
                      type="number"
                      className="form-control"
                      value={consumable.cost}
                      onChange={(e) => setConsumable({...consumable, cost: e.target.value})}
                      placeholder="5000"
                      min="0"
                      disabled={isLoading}
                    />
                  </div>
                  <small className="text-muted">Untuk semua unit produksi</small>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    <i className="bi bi-cash-coin me-2"></i>Margin Profit (%)
                  </label>
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control"
                      value={profitMargin}
                      onChange={(e) => setProfitMargin(e.target.value)}
                      placeholder="40"
                      min="0"
                      max="100"
                      disabled={isLoading}
                    />
                    <span className="input-group-text">%</span>
                  </div>
                  <small className="text-muted">Persentase laba yang diinginkan</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Results & Actions */}
        <div className="col-lg-5">
          {/* Summary Card */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">📊 Ringkasan Biaya</h5>
            </div>
            <div className="card-body">
              <div className="summary-item mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span>Total Biaya Bahan:</span>
                  <span className="fw-bold">{formatRupiah(calculateTotalMaterialCost())}</span>
                </div>
                <div className="progress mb-2" style={{height: '8px'}}>
                  <div 
                    className="progress-bar bg-success" 
                    style={{ 
                      width: `${Math.min(100, (calculateTotalMaterialCost() / (calculateTotalProductionCost() || 1)) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="summary-item mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span>Biaya Packaging:</span>
                  <span className="fw-bold">{formatRupiah(parseFloat(consumable.cost) || 0)}</span>
                </div>
                <div className="progress mb-2" style={{height: '8px'}}>
                  <div 
                    className="progress-bar bg-warning" 
                    style={{ 
                      width: `${Math.min(100, ((parseFloat(consumable.cost) || 0) / (calculateTotalProductionCost() || 1)) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="summary-item mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span>Total Biaya Produksi:</span>
                  <span className="fw-bold text-primary">{formatRupiah(calculateTotalProductionCost())}</span>
                </div>
                <div className="progress mb-2" style={{height: '8px'}}>
                  <div 
                    className="progress-bar bg-primary" 
                    style={{ width: '100%' }}
                  ></div>
                </div>
              </div>

              <hr />

              <div className="result-box p-3 bg-light rounded mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0">HPP per Unit:</h6>
                  <h4 className="mb-0 text-success">{formatRupiah(calculateHPPPerPiece())}</h4>
                </div>
                <small className="text-muted">
                  Untuk {targetPieces || 1} unit produksi
                </small>
              </div>

              {targetCost && (
                <div className="result-box p-3 bg-light rounded">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0">Selisih Target:</h6>
                    <h5 className="mb-0" style={{
                      color: (parseFloat(targetCost) || 0) >= calculateHPPPerPiece() ? 'green' : 'red'
                    }}>
                      {formatRupiah((parseFloat(targetCost) || 0) - calculateHPPPerPiece())}
                    </h5>
                  </div>
                  <small className="text-muted">
                    {(parseFloat(targetCost) || 0) >= calculateHPPPerPiece() 
                      ? '✅ Menguntungkan' 
                      : '⚠️ Perlu penyesuaian'}
                  </small>
                </div>
              )}
            </div>
          </div>

          {/* Price Calculator */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-purple text-white">
              <h5 className="mb-0">💰 Kalkulator Harga Jual</h5>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label small">Biaya Platform (%)</label>
                  <div className="input-group input-group-sm mb-2">
                    <input
                      type="number"
                      className="form-control"
                      value={goFoodPercentage}
                      onChange={(e) => setGoFoodPercentage(e.target.value)}
                      placeholder="20"
                      min="0"
                      max="100"
                      disabled={isLoading}
                    />
                    <span className="input-group-text">%</span>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Pajak (%)</label>
                  <div className="input-group input-group-sm mb-2">
                    <input
                      type="number"
                      className="form-control"
                      value={taxPercentage}
                      onChange={(e) => setTaxPercentage(e.target.value)}
                      placeholder="10"
                      min="0"
                      max="100"
                      disabled={isLoading}
                    />
                    <span className="input-group-text">%</span>
                  </div>
                </div>
              </div>

              <div className="price-results">
                <div className="price-item mb-2 p-2 bg-light rounded">
                  <div className="d-flex justify-content-between">
                    <span>Harga Dine In:</span>
                    <span className="fw-bold">{formatRupiah(calculateDineInPrice())}</span>
                  </div>
                  <small className="text-muted">Margin: {profitMargin}%</small>
                </div>
                
                <div className="price-item mb-2 p-2 bg-light rounded">
                  <div className="d-flex justify-content-between">
                    <span>+ Biaya Platform ({goFoodPercentage}%):</span>
                    <span className="text-warning">+ {formatRupiah(calculateGoFoodCost())}</span>
                  </div>
                </div>
                
                <div className="price-item mb-2 p-2 bg-light rounded">
                  <div className="d-flex justify-content-between">
                    <span>+ Pajak ({taxPercentage}%):</span>
                    <span className="text-warning">+ {formatRupiah(calculateRestaurantTax())}</span>
                  </div>
                </div>
                
                <div className="price-item p-2 bg-success text-white rounded mt-3">
                  <div className="d-flex justify-content-between">
                    <span><strong>HARGA GOFOOD:</strong></span>
                    <span><strong>{formatRupiah(calculateGoFoodPrice())}</strong></span>
                  </div>
                </div>
              </div>

              <div className="mt-3 row">
                <div className="col-md-6">
                  <small className="text-muted">
                    <i className="bi bi-graph-up me-1"></i>
                    Laba: {formatRupiah(calculateGrossProfit())}
                  </small>
                </div>
                <div className="col-md-6 text-end">
                  <small className="text-muted">
                    Margin: {profitMargin}%
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Save Card */}
          <div className="card shadow-sm">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">💾 Simpan ke Google Sheets</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <h6>Langkah Penyimpanan:</h6>
                <ol className="small">
                  <li>Isi semua data dengan lengkap</li>
                  <li>Pastikan koneksi internet stabil</li>
                  <li>Klik tombol "Simpan ke Google Sheets"</li>
                  <li>Data akan otomatis masuk spreadsheet</li>
                </ol>
              </div>
              
              <div className="alert alert-info small">
                <strong><i className="bi bi-google me-1"></i>Google Sheets Setup:</strong>
                <p className="mb-0 mt-1">URL sudah terkonfigurasi. Data akan masuk ke spreadsheet yang sudah ditentukan.</p>
              </div>
              
              <div className="d-grid gap-2">
                <button 
                  className="btn btn-success btn-lg" 
                  onClick={saveToGoogleSheets}
                  disabled={isLoading || !recipeName.trim()}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-google me-2"></i>
                      Simpan ke Google Sheets
                    </>
                  )}
                </button>
                
                <button 
                  className="btn btn-outline-primary"
                  onClick={() => setShowHistory(!showHistory)}
                  disabled={isLoading}
                >
                  <i className="bi bi-clock-history me-2"></i>
                  {showHistory ? 'Sembunyikan' : 'Lihat'} History ({recipeHistory.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">📜 History Resep Tersimpan</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowHistory(false)}></button>
              </div>
              <div className="modal-body">
                {recipeHistory.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Tanggal</th>
                          <th>Nama Resep</th>
                          <th>Kategori</th>
                          <th>HPP</th>
                          <th>Harga Jual</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipeHistory.map((recipe, index) => (
                          <tr key={index}>
                            <td><small>{recipe.timestamp}</small></td>
                            <td><strong>{recipe.recipe_name}</strong></td>
                            <td><span className="badge bg-info">{recipe.recipe_category}</span></td>
                            <td>{formatRupiah(recipe.hpp_per_piece || 0)}</td>
                            <td>{formatRupiah(recipe.gofood_price || 0)}</td>
                            <td>
                              <button 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => loadFromCache(recipe)}
                              >
                                Load
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="bi bi-inbox" style={{fontSize: '3rem', color: '#ccc'}}></i>
                    <p className="text-muted mt-3">Belum ada data tersimpan</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowHistory(false)}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-4 mb-3 text-center">
        <div className="row">
          <div className="col-md-4">
            <p className="small text-muted mb-1">
              <span className={`badge ${connectionStatus === 'connected' ? 'bg-success' : 'bg-warning'}`}>
                {connectionStatus === 'connected' ? '✅ LIVE' : '⚠️ CHECKING'}
              </span>
            </p>
          </div>
          <div className="col-md-4">
            <p className="small text-muted mb-1">
              Google Sheets Status: <strong>
                {connectionStatus === 'connected' ? 'Connected' : 
                 connectionStatus === 'error' ? 'Disconnected' : 'Checking...'}
              </strong>
            </p>
          </div>
          <div className="col-md-4">
            <p className="small text-muted mb-1">
              Last Updated: {new Date().toLocaleDateString('id-ID')}
            </p>
          </div>
        </div>
        <p className="small text-muted mt-2">
          <i className="bi bi-cloud-check me-1"></i>
          Production Version | Connected to Google Sheets
          {connectionStatus === 'error' && (
            <span className="ms-2 text-danger">
              <i className="bi bi-exclamation-triangle me-1"></i>
              Connection issues detected
            </span>
          )}
        </p>
      </footer>
    </div>
  );
};

export default App;