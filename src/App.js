import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Konfigurasi Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby0XZDtQ0keyjcZGWqhKUwNQ4sDkwpFibKgbRcZfjdDKqwYBjGY7xIXeIDgmOTqAinltA/exec';

const App = () => {
  // State untuk data produk
  const [brand, setBrand] = useState('');
  const [targetCost, setTargetCost] = useState('');
  const [targetPieces, setTargetPieces] = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [recipeCategory, setRecipeCategory] = useState('Cake');
  
  // Status dan loading
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // State untuk bahan baku
  const [ingredients, setIngredients] = useState([
    { 
      id: 1, 
      name: '', 
      usage: '', 
      unit: 'gr', 
      purchasePrice: '', 
      purchaseUnit: '', 
      purchaseUnitType: 'gram' 
    }
  ]);

  // State untuk consumable
  const [consumable, setConsumable] = useState({
    name: 'Packaging',
    cost: '',
    quantity: '1',
    unit: 'unit'
  });

  // State untuk persentase
  const [goFoodPercentage, setGoFoodPercentage] = useState(20);
  const [taxPercentage, setTaxPercentage] = useState(10);
  const [profitMargin, setProfitMargin] = useState(40);

  // State untuk history
  const [recipeHistory, setRecipeHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // ===== FUNGSI UTAMA PERHITUNGAN =====

  const calculateIngredientCost = (ingredient) => {
    const usage = parseFloat(ingredient.usage) || 0;
    const purchaseUnit = parseFloat(ingredient.purchaseUnit) || 1;
    const purchasePrice = parseFloat(ingredient.purchasePrice) || 0;
    
    if (purchaseUnit > 0 && purchasePrice > 0) {
      const cost = (usage / purchaseUnit) * purchasePrice;
      return isNaN(cost) ? 0 : cost;
    }
    return 0;
  };

  const calculateTotalMaterialCost = () => {
    return ingredients.reduce((total, ingredient) => {
      return total + calculateIngredientCost(ingredient);
    }, 0);
  };

  const calculateTotalProductionCost = () => {
    const materialCost = calculateTotalMaterialCost();
    const consumableCost = parseFloat(consumable.cost) || 0;
    const total = materialCost + consumableCost;
    return isNaN(total) ? 0 : total;
  };

  const calculateHPPPerPiece = () => {
    const totalCost = calculateTotalProductionCost();
    const pieces = parseFloat(targetPieces) || 1;
    if (pieces === 0) return 0;
    const hpp = totalCost / pieces;
    return isNaN(hpp) ? 0 : hpp;
  };

  const calculateDineInPrice = () => {
    const hpp = calculateHPPPerPiece();
    const margin = profitMargin / 100;
    if (margin >= 1) return hpp * 2;
    const price = hpp / (1 - margin);
    return isNaN(price) ? 0 : price;
  };

  const calculateGoFoodCost = () => {
    const dineInPrice = calculateDineInPrice();
    const cost = dineInPrice * (goFoodPercentage / 100);
    return isNaN(cost) ? 0 : cost;
  };

  const calculateRestaurantTax = () => {
    const dineInPrice = calculateDineInPrice();
    const tax = dineInPrice * (taxPercentage / 100);
    return isNaN(tax) ? 0 : tax;
  };

  const calculateGoFoodPrice = () => {
    const dineInPrice = calculateDineInPrice();
    const goFoodCost = calculateGoFoodCost();
    const tax = calculateRestaurantTax();
    const total = dineInPrice + goFoodCost + tax;
    return isNaN(total) ? 0 : total;
  };

  const calculateGrossProfit = () => {
    const dineInPrice = calculateDineInPrice();
    const hpp = calculateHPPPerPiece();
    const profit = dineInPrice - hpp;
    return isNaN(profit) ? 0 : profit;
  };

  // ===== FUNGSI MANAJEMEN BAHAN =====

  const updateIngredient = (id, field, value) => {
    setIngredients(ingredients.map(ingredient =>
      ingredient.id === id ? { ...ingredient, [field]: value } : ingredient
    ));
  };

  const addIngredient = () => {
    const newId = ingredients.length > 0 ? Math.max(...ingredients.map(i => i.id)) + 1 : 1;
    setIngredients([
      ...ingredients,
      {
        id: newId,
        name: '',
        usage: '',
        unit: 'gr',
        purchasePrice: '',
        purchaseUnit: '',
        purchaseUnitType: 'gram'
      }
    ]);
  };

  const removeIngredient = (id) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ingredient => ingredient.id !== id));
    }
  };

  // ===== FUNGSI RESET =====

  const resetAllData = () => {
    setBrand('');
    setTargetCost('');
    setTargetPieces('');
    setRecipeName('');
    setRecipeCategory('Cake');
    setIngredients([{ 
      id: 1, 
      name: '', 
      usage: '', 
      unit: 'gr', 
      purchasePrice: '', 
      purchaseUnit: '', 
      purchaseUnitType: 'gram' 
    }]);
    setConsumable({ name: 'Packaging', cost: '', quantity: '1', unit: 'unit' });
    setGoFoodPercentage(20);
    setTaxPercentage(10);
    setProfitMargin(40);
    setSaveStatus({ type: '', message: '' });
  };

  // ===== FUNGSI SIMPAN KE GOOGLE SHEETS =====

  const saveToGoogleSheets = async () => {
    // Validasi
    if (!recipeName.trim()) {
      setSaveStatus({ type: 'error', message: '⚠️ Masukkan nama resep terlebih dahulu' });
      return;
    }

    // Validasi bahan
    const invalidIngredients = ingredients.filter(ing => 
      !ing.name.trim() || !ing.usage || !ing.purchasePrice || !ing.purchaseUnit
    );
    
    if (invalidIngredients.length > 0) {
      setSaveStatus({ 
        type: 'error', 
        message: `⚠️ Isi data lengkap untuk ${invalidIngredients.length} bahan yang masih kosong` 
      });
      return;
    }

    setIsLoading(true);
    setSaveStatus({ type: 'loading', message: '📤 Mengirim data ke Google Sheets...' });

    try {
      // Format tanggal
      const now = new Date();
      const timestamp = now.toLocaleString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Siapkan data utama
      const summaryData = {
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

      // Siapkan data bahan
      const ingredientsData = ingredients.map((ing, index) => ({
        recipe_name: recipeName.trim(),
        ingredient_no: index + 1,
        ingredient_name: ing.name.trim(),
        usage_amount: parseFloat(ing.usage) || 0,
        usage_unit: ing.unit,
        purchase_price: parseFloat(ing.purchasePrice) || 0,
        purchase_unit: parseFloat(ing.purchaseUnit) || 1,
        ingredient_cost: calculateIngredientCost(ing)
      }));

      // Data packaging
      const packagingData = {
        recipe_name: recipeName.trim(),
        item_name: consumable.name,
        cost: parseFloat(consumable.cost) || 0,
        quantity: consumable.quantity,
        unit: consumable.unit
      };

      // Gabungkan semua data
      const allData = {
        action: 'save_recipe',
        timestamp: timestamp,
        summary: summaryData,
        ingredients: ingredientsData,
        packaging: packagingData
      };

      console.log('Data yang dikirim:', allData);

      // Kirim ke Google Apps Script
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(allData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setSaveStatus({ 
          type: 'success', 
          message: `✅ Data berhasil disimpan ke Google Sheets! ID: ${result.sheetId || 'N/A'}` 
        });
        
        // Simpan juga ke localStorage sebagai cache
        saveToLocalCache(summaryData, ingredientsData);
        
        // Reset form setelah berhasil
        setTimeout(() => {
          resetAllData();
        }, 3000);
        
      } else {
        throw new Error(result.message || 'Gagal menyimpan data');
      }

    } catch (error) {
      console.error('Error saving to Google Sheets:', error);
      setSaveStatus({ 
        type: 'error', 
        message: `❌ Gagal mengirim data: ${error.message}. Coba lagi atau periksa koneksi internet.` 
      });
      
      // Coba simpan ke localStorage sebagai fallback
      try {
        const summaryData = {
          timestamp: new Date().toLocaleString('id-ID'),
          recipe_name: recipeName.trim(),
          recipe_category: recipeCategory,
          hpp_per_piece: calculateHPPPerPiece(),
          gofood_price: calculateGoFoodPrice()
        };
        
        const existing = JSON.parse(localStorage.getItem('hpp_backup') || '[]');
        existing.push({ ...summaryData, error: error.message });
        localStorage.setItem('hpp_backup', JSON.stringify(existing.slice(-10))); // Simpan 10 terakhir
        
        setSaveStatus(prev => ({
          ...prev,
          message: prev.message + ' (Data disimpan lokal sebagai backup)'
        }));
      } catch (localError) {
        console.error('Juga gagal menyimpan lokal:', localError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ===== FUNGSI CACHE LOKAL =====

  const saveToLocalCache = (summaryData, ingredientsData) => {
    try {
      const cacheData = {
        ...summaryData,
        ingredients: ingredientsData,
        cached_at: new Date().toISOString()
      };
      
      const existingCache = JSON.parse(localStorage.getItem('hpp_cache') || '[]');
      existingCache.unshift(cacheData);
      
      // Simpan maksimal 20 resep terakhir
      localStorage.setItem('hpp_cache', JSON.stringify(existingCache.slice(0, 20)));
      setRecipeHistory(existingCache.slice(0, 20));
      
    } catch (error) {
      console.error('Error saving cache:', error);
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
    
    // Note: Ingredients tidak bisa di-load dari cache karena struktur berbeda
    setSaveStatus({ type: 'info', message: '📂 Resep dimuat. Isi ulang data bahan baku.' });
    setShowHistory(false);
  };

  // ===== FUNGSI TEST KONEKSI =====

  const testConnection = async () => {
    try {
      setConnectionStatus('checking');
      
      const testData = {
        action: 'test_connection',
        timestamp: new Date().toISOString(),
        test: true
      };

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        const result = await response.json();
        setConnectionStatus('connected');
        setSaveStatus({ type: 'success', message: '✅ Terhubung ke Google Sheets!' });
      } else {
        setConnectionStatus('error');
        setSaveStatus({ type: 'error', message: '❌ Gagal terhubung ke Google Sheets' });
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
      setSaveStatus({ type: 'error', message: '❌ Error koneksi: ' + error.message });
    }
  };

  // ===== FUNGSI EXPORT CSV =====

  const exportToCSV = () => {
    const data = {
      'Timestamp': new Date().toLocaleString('id-ID'),
      'Nama Resep': recipeName || 'Tanpa Nama',
      'Kategori': recipeCategory,
      'Brand': brand || '-',
      'Target Biaya': formatRupiah(parseFloat(targetCost) || 0),
      'Target Jumlah': targetPieces || '0',
      'Total Biaya Bahan': formatRupiah(calculateTotalMaterialCost()),
      'Biaya Packaging': formatRupiah(parseFloat(consumable.cost) || 0),
      'Total Biaya Produksi': formatRupiah(calculateTotalProductionCost()),
      'HPP per Unit': formatRupiah(calculateHPPPerPiece()),
      'Margin Profit': `${profitMargin}%`,
      'Harga Dine In': formatRupiah(calculateDineInPrice()),
      'Biaya Platform': `${goFoodPercentage}%`,
      'Pajak': `${taxPercentage}%`,
      'Harga GoFood': formatRupiah(calculateGoFoodPrice()),
      'Laba Kotor': formatRupiah(calculateGrossProfit())
    };

    let csvContent = "Data Kalkulator HPP\n\n";
    csvContent += "SUMMARY\n";
    Object.entries(data).forEach(([key, value]) => {
      csvContent += `${key},"${value}"\n`;
    });

    csvContent += "\nBAHAN BAKU\n";
    csvContent += '"No","Nama Bahan","Jumlah Pakai","Satuan","Harga Beli","Satuan Beli","Biaya"\n';
    
    ingredients.forEach((ing, index) => {
      csvContent += `"${index + 1}","${ing.name || '-'}","${ing.usage || '0'}","${ing.unit}","${formatRupiah(ing.purchasePrice || 0)}","${ing.purchaseUnit || '0'}","${formatRupiah(calculateIngredientCost(ing))}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `HPP_${recipeName || 'Data'}_${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSaveStatus({ type: 'success', message: '📥 File CSV berhasil di-download' });
  };

  // ===== FORMAT RUPIAH =====

  const formatRupiah = (number) => {
    if (isNaN(number) || number === 0) return 'Rp 0';
    return `Rp ${Math.round(number).toLocaleString('id-ID')}`;
  };

  // ===== USE EFFECT =====

  useEffect(() => {
    // Load cache saat mount
    const cached = JSON.parse(localStorage.getItem('hpp_cache') || '[]');
    setRecipeHistory(cached);
    
    // Test koneksi
    testConnection();
  }, []);

  // ===== RENDER =====

  return (
    <div className="container mt-3">
      {/* Header */}
      <div className="header-section text-center mb-4">
        <h1 className="text-primary">📊 Kalkulator HPP + Google Sheets</h1>
        <p className="text-muted">Data otomatis tersimpan ke Google Spreadsheet</p>
        
        {/* Connection Status */}
        <div className="d-flex justify-content-center align-items-center mb-3">
          <div className={`badge ${connectionStatus === 'connected' ? 'bg-success' : 
                           connectionStatus === 'error' ? 'bg-danger' : 'bg-warning'} me-2`}>
            {connectionStatus === 'connected' ? '✅ Terhubung' : 
             connectionStatus === 'error' ? '❌ Offline' : '⌛ Mengecek...'}
          </div>
          <small className="text-muted">
            {connectionStatus === 'connected' ? 'Siap menyimpan ke Google Sheets' :
             'Periksa koneksi internet'}
          </small>
          <button 
            className="btn btn-sm btn-outline-secondary ms-2"
            onClick={testConnection}
            disabled={isLoading}
          >
            🔄 Test Koneksi
          </button>
        </div>

        {/* Status Message */}
        {saveStatus.message && (
          <div className={`alert ${saveStatus.type === 'success' ? 'alert-success' : 
                           saveStatus.type === 'error' ? 'alert-danger' : 
                           saveStatus.type === 'loading' ? 'alert-info' : 
                           'alert-warning'} alert-dismissible fade show`} 
               style={{maxWidth: '600px', margin: '0 auto'}}>
            <div className="d-flex justify-content-between align-items-center">
              <span>{saveStatus.message}</span>
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
                  disabled={isLoading || !recipeName.trim() || connectionStatus !== 'connected'}
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
                  onClick={exportToCSV}
                  disabled={isLoading}
                >
                  <i className="bi bi-download me-2"></i>
                  Download CSV
                </button>
                
                <button 
                  className="btn btn-outline-secondary"
                  onClick={() => setShowHistory(!showHistory)}
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
      <footer className="mt-4 mb-3 text-center text-muted">
        <p className="small">
          <i className="bi bi-google me-1"></i>
          Google Sheets Integration © {new Date().getFullYear()} | 
          Status: <span className={connectionStatus === 'connected' ? 'text-success' : 'text-warning'}>
            {connectionStatus === 'connected' ? 'Online' : 'Offline'}
          </span>
        </p>
      </footer>
    </div>
  );
};

export default App;