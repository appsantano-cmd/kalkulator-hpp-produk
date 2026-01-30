import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyLEjp-p9CFvpu9lLEfz1I7TPA1iLeYO4KEJVISKnl5AfReHVM3yqzoteNaNjMOJoAS0g/exec';

const CATEGORIES = {
  'Makanan': ['Kids Menu', 'Appetizer', 'Main Course', 'Dessert', 'Breakfast Menu', 'Veggies', 'Others'],
  'Minuman': ['Signature', 'Espresso Based', 'Single Origin', 'Frappuccino', 'Milkshake', 'Ice Cream', 'Non Coffee']
};

const App = () => {
  const [brand, setBrand] = useState('');
  const [targetCost, setTargetCost] = useState('');
  const [targetPieces, setTargetPieces] = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [recipeCategory, setRecipeCategory] = useState('Makanan');
  const [recipeSubCategory, setRecipeSubCategory] = useState('Main Course');
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [lastCheck, setLastCheck] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editRecipeId, setEditRecipeId] = useState(null);
  const [editRecipeRow, setEditRecipeRow] = useState(null);

  const [ingredients, setIngredients] = useState([{ id: 1, name: '', usage: '', unit: 'gr', purchasePrice: '', purchaseUnit: '' }]);
  const [consumable, setConsumable] = useState({ name: 'Packaging', cost: '', quantity: '1', unit: 'unit' });
  const [goFoodPercentage, setGoFoodPercentage] = useState(20);
  const [taxPercentage, setTaxPercentage] = useState(10);
  const [profitMargin, setProfitMargin] = useState(40);
  
  const [recipeHistory, setRecipeHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [availableRecipes, setAvailableRecipes] = useState([]);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);

  useEffect(() => {
    const subCategories = CATEGORIES[recipeCategory] || [];
    if (subCategories.length > 0 && !recipeSubCategory) {
      setRecipeSubCategory(subCategories[0]);
    }
  }, [recipeCategory, recipeSubCategory]);

  // ===== UTILITY FUNCTIONS =====
  const formatRupiah = (number) => {
    if (isNaN(number) || number === 0) return 'Rp 0';
    return `Rp ${Math.round(number).toLocaleString('id-ID')}`;
  };

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
    return margin > 0 ? hpp / (1 - margin) : hpp;
  };

  const calculateGoFoodCost = () => calculateDineInPrice() * (goFoodPercentage / 100);
  const calculateRestaurantTax = () => calculateDineInPrice() * (taxPercentage / 100);
  const calculateGoFoodPrice = () => calculateDineInPrice() + calculateGoFoodCost() + calculateRestaurantTax();
  const calculateGrossProfit = () => calculateDineInPrice() - calculateHPPPerPiece();

  // ===== INGREDIENT MANAGEMENT =====
  const updateIngredient = (id, field, value) => {
    setIngredients(ingredients.map(ingredient =>
      ingredient.id === id ? { ...ingredient, [field]: value } : ingredient
    ));
  };

  const addIngredient = () => {
    const newId = ingredients.length > 0 ? Math.max(...ingredients.map(i => i.id)) + 1 : 1;
    setIngredients([...ingredients, { id: newId, name: '', usage: '', unit: 'gr', purchasePrice: '', purchaseUnit: '' }]);
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
    setRecipeCategory('Makanan');
    setRecipeSubCategory('Main Course');
    setIngredients([{ id: 1, name: '', usage: '', unit: 'gr', purchasePrice: '', purchaseUnit: '' }]);
    setConsumable({ name: 'Packaging', cost: '', quantity: '1', unit: 'unit' });
    setGoFoodPercentage(20);
    setTaxPercentage(10);
    setProfitMargin(40);
    setSaveStatus({ type: '', message: '' });
    setEditMode(false);
    setEditRecipeId(null);
    setEditRecipeRow(null);
  };

  // ===== CONNECTION TEST =====
  const testConnection = async () => {
    try {
      setConnectionStatus('checking');
      setSaveStatus({ type: 'loading', message: '🔄 Testing connection...' });
      
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ping' })
      });
      
      setConnectionStatus('connected');
      setLastCheck(new Date());
      setSaveStatus({ type: 'success', message: '✅ Connected to Google Sheets!' });
      
    } catch (error) {
      setConnectionStatus('error');
      setLastCheck(new Date());
      setSaveStatus({ type: 'error', message: '❌ Connection failed' });
    }
  };

  // ===== LOAD RECIPES FROM GOOGLE SHEETS =====
  const loadRecipesFromGoogleSheets = async () => {
    try {
      setIsLoading(true);
      setSaveStatus({ type: 'loading', message: '📥 Loading recipes...' });
      
      // Gunakan form submission untuk menghindari CORS
      const form = document.createElement('form');
      const iframe = document.createElement('iframe');
      iframe.name = 'load-recipes-iframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      form.target = iframe.name;
      form.action = GOOGLE_SCRIPT_URL;
      form.method = 'POST';
      form.style.display = 'none';
      
      const input = document.createElement('input');
      input.name = 'data';
      input.value = JSON.stringify({ action: 'get_recipes' });
      form.appendChild(input);
      
      document.body.appendChild(form);
      form.submit();
      
      // Set timeout untuk response
      setTimeout(async () => {
        try {
          // Coba GET request untuk mendapatkan data
          const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=get_recipes&t=${Date.now()}`);
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.recipes) {
              setAvailableRecipes(result.recipes);
              setShowRecipeSelector(true);
              setSaveStatus({ type: 'success', message: `✅ Loaded ${result.recipes.length} recipes` });
            } else {
              setSaveStatus({ type: 'warning', message: 'No recipes found' });
            }
          }
        } catch (error) {
          console.log('Error loading recipes:', error);
          setSaveStatus({ type: 'error', message: 'Failed to load recipes' });
        }
        
        document.body.removeChild(form);
        document.body.removeChild(iframe);
        setIsLoading(false);
      }, 3000);
      
    } catch (error) {
      setIsLoading(false);
      setSaveStatus({ type: 'error', message: 'Error loading recipes' });
    }
  };

  // ===== LOAD SPECIFIC RECIPE FOR EDITING =====
  const loadRecipeForEditing = async (recipeId, rowNumber) => {
    try {
      setIsLoading(true);
      setSaveStatus({ type: 'loading', message: '📥 Loading recipe...' });
      
      // Gunakan form submission
      const form = document.createElement('form');
      const iframe = document.createElement('iframe');
      iframe.name = 'load-recipe-iframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      form.target = iframe.name;
      form.action = GOOGLE_SCRIPT_URL;
      form.method = 'POST';
      form.style.display = 'none';
      
      const input = document.createElement('input');
      input.name = 'data';
      input.value = JSON.stringify({ 
        action: 'get_recipe',
        recipe_id: rowNumber || recipeId
      });
      form.appendChild(input);
      
      document.body.appendChild(form);
      form.submit();
      
      setTimeout(async () => {
        try {
          const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=get_recipe&recipe_id=${rowNumber || recipeId}&t=${Date.now()}`);
          
          if (response.ok) {
            const result = await response.json();
            
            if (result.success && result.recipe) {
              const recipe = result.recipe;
              
              // Isi form dengan data dari Google Sheets
              setRecipeName(recipe.recipe_name || '');
              setRecipeCategory(recipe.recipe_category || 'Makanan');
              setRecipeSubCategory(recipe.recipe_subcategory || 'Main Course');
              setBrand(recipe.brand || '');
              setTargetCost(recipe.target_cost?.toString() || '');
              setTargetPieces(recipe.target_pieces?.toString() || '');
              setProfitMargin(recipe.profit_margin || 40);
              setGoFoodPercentage(recipe.gofood_percentage || 20);
              setTaxPercentage(recipe.tax_percentage || 10);
              
              // Isi ingredients
              if (recipe.ingredients && recipe.ingredients.length > 0) {
                const formattedIngredients = recipe.ingredients.map((ing, index) => ({
                  id: index + 1,
                  name: ing.name || ing.ingredient_name || '',
                  usage: ing.usage?.toString() || ing.usage_amount?.toString() || '',
                  unit: ing.unit || ing.usage_unit || 'gr',
                  purchasePrice: ing.purchase_price?.toString() || '',
                  purchaseUnit: ing.purchase_unit?.toString() || '1'
                }));
                setIngredients(formattedIngredients);
              }
              
              // Isi packaging
              if (recipe.packaging) {
                setConsumable({
                  name: recipe.packaging.name || recipe.packaging.item || 'Packaging',
                  cost: recipe.packaging.cost?.toString() || '',
                  quantity: recipe.packaging.quantity?.toString() || '1',
                  unit: recipe.packaging.unit || 'unit'
                });
              }
              
              setEditMode(true);
              setEditRecipeId(recipe.id);
              setEditRecipeRow(rowNumber || recipeId);
              setShowRecipeSelector(false);
              setSaveStatus({ type: 'success', message: `✅ "${recipe.recipe_name}" loaded for editing` });
              
            } else {
              setSaveStatus({ type: 'error', message: 'Failed to load recipe data' });
            }
          }
        } catch (error) {
          setSaveStatus({ type: 'error', message: 'Error loading recipe data' });
        }
        
        document.body.removeChild(form);
        document.body.removeChild(iframe);
        setIsLoading(false);
      }, 3000);
      
    } catch (error) {
      setIsLoading(false);
      setSaveStatus({ type: 'error', message: 'Error loading recipe' });
    }
  };

  // ===== SAVE TO GOOGLE SHEETS =====
  const saveToGoogleSheets = async (isUpdate = false) => {
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
    setSaveStatus({ type: 'loading', message: isUpdate ? '🔄 Updating...' : '📤 Saving...' });

    try {
      const now = new Date();
      const timestamp = now.toLocaleString('id-ID');

      // Prepare data untuk 3 sheets
      const summaryData = {
        timestamp: timestamp,
        recipe_name: recipeName.trim(),
        recipe_category: recipeCategory,
        recipe_subcategory: recipeSubCategory,
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
        status: isUpdate ? 'UPDATED' : 'SAVED'
      };

      const ingredientsData = ingredients.map((ing, index) => ({
        ingredient_name: ing.name.trim(),
        usage_amount: parseFloat(ing.usage) || 0,
        usage_unit: ing.unit,
        purchase_price: parseFloat(ing.purchasePrice) || 0,
        purchase_unit: parseFloat(ing.purchaseUnit) || 1,
        ingredient_cost: calculateIngredientCost(ing)
      }));

      const packagingData = {
        item_name: consumable.name,
        cost: parseFloat(consumable.cost) || 0,
        quantity: consumable.quantity,
        unit: consumable.unit
      };

      const allData = {
        action: isUpdate ? 'update_recipe' : 'save_recipe',
        timestamp: timestamp,
        recipe_id: editRecipeRow || editRecipeId, // Kirim row number untuk update
        summary: summaryData,
        ingredients: ingredientsData,
        packaging: packagingData,
        source: 'Netlify App'
      };

      // Gunakan form submission
      const form = document.createElement('form');
      const iframe = document.createElement('iframe');
      iframe.name = 'save-recipe-iframe-' + Date.now();
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      form.target = iframe.name;
      form.action = GOOGLE_SCRIPT_URL;
      form.method = 'POST';
      form.style.display = 'none';
      
      const input = document.createElement('input');
      input.name = 'data';
      input.value = JSON.stringify(allData);
      form.appendChild(input);
      
      document.body.appendChild(form);
      form.submit();
      
      // Simpan ke cache lokal
      saveToLocalCache(summaryData, ingredientsData);
      
      // Beri feedback
      setTimeout(() => {
        setSaveStatus({ 
          type: 'success', 
          message: `✅ Recipe "${recipeName}" ${isUpdate ? 'updated' : 'saved'} successfully!` 
        });
        
        setTimeout(() => {
          resetAllData();
          setSaveStatus({ type: 'info', message: '📝 Form cleared' });
        }, 3000);
        
        document.body.removeChild(form);
        document.body.removeChild(iframe);
        setIsLoading(false);
      }, 2000);

    } catch (error) {
      setSaveStatus({ type: 'error', message: '❌ Save failed' });
      setIsLoading(false);
    }
  };

  // ===== LOCAL CACHE =====
  const saveToLocalCache = (summaryData, ingredientsData) => {
    try {
      const cacheData = { ...summaryData, ingredients: ingredientsData, cached_at: new Date().toISOString() };
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
    setRecipeCategory(recipe.recipe_category || 'Makanan');
    setRecipeSubCategory(recipe.recipe_subcategory || 'Main Course');
    setBrand(recipe.brand);
    setTargetCost(recipe.target_cost?.toString() || '');
    setTargetPieces(recipe.target_pieces?.toString() || '');
    setProfitMargin(recipe.profit_margin || 40);
    setGoFoodPercentage(recipe.gofood_percentage || 20);
    setTaxPercentage(recipe.tax_percentage || 10);
    setSaveStatus({ type: 'info', message: '📂 Recipe loaded from cache' });
    setShowHistory(false);
  };

  // ===== INITIAL LOAD =====
  useEffect(() => {
    testConnection();
    const cached = JSON.parse(localStorage.getItem('hpp_cache') || '[]');
    setRecipeHistory(cached);
    
    const interval = setInterval(() => {
      if (connectionStatus !== 'connected') {
        testConnection();
      }
    }, 120000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mt-3">
      {/* Header */}
      <div className="header-section text-center mb-4">
        <h1 className="text-primary">🚀 HPP Calculator - Production</h1>
        <p className="text-muted">Connected to Google Sheets (3 Sheets)</p>
        
        <div className="d-flex justify-content-center align-items-center mb-3">
          <div className={`badge ${connectionStatus === 'connected' ? 'bg-success' : 
                           connectionStatus === 'error' ? 'bg-danger' : 'bg-warning'} me-2`}
               style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
            {connectionStatus === 'connected' ? '✅ ONLINE' : 
             connectionStatus === 'error' ? '❌ OFFLINE' : '⌛ CHECKING...'}
          </div>
          
          <button className="btn btn-sm btn-outline-secondary ms-2" onClick={testConnection} disabled={isLoading}>
            {isLoading ? <span className="spinner-border spinner-border-sm me-1"></span> : '🔄 Test'}
          </button>
          
          {lastCheck && <small className="text-muted ms-2">Last check: {lastCheck.toLocaleTimeString()}</small>}
        </div>

        {saveStatus.message && (
          <div className={`alert ${saveStatus.type === 'success' ? 'alert-success' : 
                           saveStatus.type === 'error' ? 'alert-danger' : 
                           saveStatus.type === 'loading' ? 'alert-info' : 
                           'alert-warning'} alert-dismissible fade show`} style={{maxWidth: '800px', margin: '0 auto'}}>
            <div className="d-flex justify-content-between align-items-center">
              <div><strong>{saveStatus.message}</strong></div>
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
        
        <div className="mt-2 small text-muted">
          <span>Sheets: Summary, Ingredients, Packaging</span>
          <span className="ms-3">Status: {connectionStatus}</span>
        </div>
      </div>

      {editMode && (
        <div className="alert alert-warning text-center">
          <i className="bi bi-pencil-fill me-2"></i>
          <strong>EDIT MODE:</strong> Editing "{recipeName}" (Row: {editRecipeRow || editRecipeId})
        </div>
      )}

      {/* Main Content */}
      <div className="row">
        {/* Left Column - Form */}
        <div className="col-lg-7">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">{editMode ? '✏️ Edit Recipe' : '📝 New Recipe'}</h5>
              <div>
                <button className="btn btn-light btn-sm me-2" onClick={resetAllData} disabled={isLoading}>
                  {editMode ? '❌ Cancel' : '🔄 Reset'}
                </button>
                {!editMode && (
                  <button className="btn btn-warning btn-sm" onClick={loadRecipesFromGoogleSheets} disabled={isLoading}>
                    <i className="bi bi-pencil me-1"></i>Edit Existing
                  </button>
                )}
              </div>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label"><i className="bi bi-journal-text me-2"></i>Nama Resep *</label>
                  <input type="text" className="form-control" value={recipeName} 
                    onChange={(e) => setRecipeName(e.target.value)} placeholder="Contoh: Spaghetti Carbonara" 
                    disabled={isLoading} required />
                  <small className="text-muted">Wajib diisi</small>
                </div>
                <div className="col-md-6">
                  <label className="form-label"><i className="bi bi-tags me-2"></i>Kategori HPP</label>
                  <select className="form-select mb-2" value={recipeCategory} 
                    onChange={(e) => { setRecipeCategory(e.target.value); setRecipeSubCategory(CATEGORIES[e.target.value][0]); }} 
                    disabled={isLoading}>
                    <option value="Makanan">Makanan</option>
                    <option value="Minuman">Minuman</option>
                  </select>
                  <select className="form-select" value={recipeSubCategory} 
                    onChange={(e) => setRecipeSubCategory(e.target.value)} disabled={isLoading}>
                    {CATEGORIES[recipeCategory]?.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label"><i className="bi bi-shop me-2"></i>Nama Produk / Brand</label>
                  <input type="text" className="form-control" value={brand} 
                    onChange={(e) => setBrand(e.target.value)} placeholder="Contoh: Signature Dish" disabled={isLoading} />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label"><i className="bi bi-bullseye me-2"></i>Target Biaya</label>
                  <div className="input-group">
                    <span className="input-group-text">Rp</span>
                    <input type="number" className="form-control" value={targetCost} 
                      onChange={(e) => setTargetCost(e.target.value)} placeholder="Target" min="0" disabled={isLoading} />
                  </div>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label"><i className="bi bi-box-seam me-2"></i>Jumlah Produksi</label>
                  <div className="input-group">
                    <input type="number" className="form-control" value={targetPieces} 
                      onChange={(e) => setTargetPieces(e.target.value)} placeholder="Jumlah" min="1" disabled={isLoading} />
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
              <button className="btn btn-light btn-sm" onClick={addIngredient} disabled={isLoading}>
                <i className="bi bi-plus-circle me-1"></i>Tambah
              </button>
            </div>
            <div className="card-body">
              {ingredients.map((ingredient, index) => (
                <div key={ingredient.id} className="ingredient-card mb-3 p-3 border rounded">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0"><span className="badge bg-secondary me-2">{index + 1}</span>{ingredient.name || 'Bahan Baru'}</h6>
                    {ingredients.length > 1 && (
                      <button className="btn btn-outline-danger btn-sm" onClick={() => removeIngredient(ingredient.id)} disabled={isLoading}>
                        <i className="bi bi-trash"></i>
                      </button>
                    )}
                  </div>
                  
                  <div className="row g-2">
                    <div className="col-md-4"><label className="form-label small">Nama Bahan *</label>
                      <input type="text" className="form-control form-control-sm" value={ingredient.name} 
                        onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)} placeholder="Tepung Terigu" disabled={isLoading} required />
                    </div>
                    <div className="col-md-3"><label className="form-label small">Jumlah Pakai *</label>
                      <div className="input-group input-group-sm">
                        <input type="number" className="form-control" value={ingredient.usage} 
                          onChange={(e) => updateIngredient(ingredient.id, 'usage', e.target.value)} placeholder="360" step="0.01" min="0" disabled={isLoading} required />
                        <select className="form-select" style={{ width: '80px' }} value={ingredient.unit} 
                          onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)} disabled={isLoading}>
                          <option value="gr">gr</option><option value="ml">ml</option><option value="kg">kg</option>
                          <option value="pcs">pcs</option><option value="sdm">sdm</option><option value="sdt">sdt</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-3"><label className="form-label small">Harga Beli *</label>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text">Rp</span>
                        <input type="number" className="form-control" value={ingredient.purchasePrice} 
                          onChange={(e) => updateIngredient(ingredient.id, 'purchasePrice', e.target.value)} placeholder="25000" step="100" min="0" disabled={isLoading} required />
                      </div>
                    </div>
                    <div className="col-md-2"><label className="form-label small">Satuan Beli *</label>
                      <input type="number" className="form-control form-control-sm" value={ingredient.purchaseUnit} 
                        onChange={(e) => updateIngredient(ingredient.id, 'purchaseUnit', e.target.value)} placeholder="1000" step="0.01" min="0.01" disabled={isLoading} required />
                      <small className="text-muted">dalam {ingredient.unit}</small>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <small className="text-success"><i className="bi bi-calculator me-1"></i>Biaya: <strong>{formatRupiah(calculateIngredientCost(ingredient))}</strong></small>
                  </div>
                </div>
              ))}
              
              <div className="mt-3">
                <small className="text-muted"><i className="bi bi-info-circle me-1"></i>Total semua bahan: <strong>{formatRupiah(calculateTotalMaterialCost())}</strong></small>
              </div>
            </div>
          </div>

          {/* Additional Costs */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-warning"><h5 className="mb-0">📦 Biaya Tambahan</h5></div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label"><i className="bi bi-box me-2"></i>Biaya Packaging</label>
                  <div className="input-group">
                    <span className="input-group-text">Rp</span>
                    <input type="number" className="form-control" value={consumable.cost} 
                      onChange={(e) => setConsumable({...consumable, cost: e.target.value})} placeholder="5000" min="0" disabled={isLoading} />
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label"><i className="bi bi-cash-coin me-2"></i>Margin Profit (%)</label>
                  <div className="input-group">
                    <input type="number" className="form-control" value={profitMargin} 
                      onChange={(e) => setProfitMargin(e.target.value)} placeholder="40" min="0" max="100" disabled={isLoading} />
                    <span className="input-group-text">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Results */}
        <div className="col-lg-5">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-info text-white"><h5 className="mb-0">📊 Ringkasan Biaya</h5></div>
            <div className="card-body">
              <div className="summary-item mb-3">
                <div className="d-flex justify-content-between mb-1"><span>Total Biaya Bahan:</span><span className="fw-bold">{formatRupiah(calculateTotalMaterialCost())}</span></div>
                <div className="progress mb-2" style={{height: '8px'}}>
                  <div className="progress-bar bg-success" style={{width: `${Math.min(100, (calculateTotalMaterialCost() / (calculateTotalProductionCost() || 1)) * 100)}%`}}></div>
                </div>
              </div>
              <div className="summary-item mb-3">
                <div className="d-flex justify-content-between mb-1"><span>Biaya Packaging:</span><span className="fw-bold">{formatRupiah(parseFloat(consumable.cost) || 0)}</span></div>
                <div className="progress mb-2" style={{height: '8px'}}>
                  <div className="progress-bar bg-warning" style={{width: `${Math.min(100, ((parseFloat(consumable.cost) || 0) / (calculateTotalProductionCost() || 1)) * 100)}%`}}></div>
                </div>
              </div>
              <div className="summary-item mb-3">
                <div className="d-flex justify-content-between mb-1"><span>Total Biaya Produksi:</span><span className="fw-bold text-primary">{formatRupiah(calculateTotalProductionCost())}</span></div>
                <div className="progress mb-2" style={{height: '8px'}}><div className="progress-bar bg-primary" style={{width: '100%'}}></div></div>
              </div>
              <hr />
              <div className="result-box p-3 bg-light rounded mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0">HPP per Unit:</h6>
                  <h4 className="mb-0 text-success">{formatRupiah(calculateHPPPerPiece())}</h4>
                </div>
                <small className="text-muted">Untuk {targetPieces || 1} unit produksi</small>
              </div>
              {targetCost && (
                <div className="result-box p-3 bg-light rounded">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0">Selisih Target:</h6>
                    <h5 className="mb-0" style={{color: (parseFloat(targetCost) || 0) >= calculateHPPPerPiece() ? 'green' : 'red'}}>
                      {formatRupiah((parseFloat(targetCost) || 0) - calculateHPPPerPiece())}
                    </h5>
                  </div>
                  <small className="text-muted">{(parseFloat(targetCost) || 0) >= calculateHPPPerPiece() ? '✅ Menguntungkan' : '⚠️ Perlu penyesuaian'}</small>
                </div>
              )}
            </div>
          </div>

          {/* Price Calculator */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-purple text-white"><h5 className="mb-0">💰 Kalkulator Harga Jual</h5></div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label small">Biaya Platform (%)</label>
                  <div className="input-group input-group-sm mb-2">
                    <input type="number" className="form-control" value={goFoodPercentage} onChange={(e) => setGoFoodPercentage(e.target.value)} placeholder="20" min="0" max="100" disabled={isLoading} />
                    <span className="input-group-text">%</span>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Pajak (%)</label>
                  <div className="input-group input-group-sm mb-2">
                    <input type="number" className="form-control" value={taxPercentage} onChange={(e) => setTaxPercentage(e.target.value)} placeholder="10" min="0" max="100" disabled={isLoading} />
                    <span className="input-group-text">%</span>
                  </div>
                </div>
              </div>
              <div className="price-results">
                <div className="price-item mb-2 p-2 bg-light rounded">
                  <div className="d-flex justify-content-between"><span>Harga Dine In:</span><span className="fw-bold">{formatRupiah(calculateDineInPrice())}</span></div>
                  <small className="text-muted">Margin: {profitMargin}%</small>
                </div>
                <div className="price-item mb-2 p-2 bg-light rounded">
                  <div className="d-flex justify-content-between"><span>+ Biaya Platform ({goFoodPercentage}%):</span><span className="text-warning">+ {formatRupiah(calculateGoFoodCost())}</span></div>
                </div>
                <div className="price-item mb-2 p-2 bg-light rounded">
                  <div className="d-flex justify-content-between"><span>+ Pajak ({taxPercentage}%):</span><span className="text-warning">+ {formatRupiah(calculateRestaurantTax())}</span></div>
                </div>
                <div className="price-item p-2 bg-success text-white rounded mt-3">
                  <div className="d-flex justify-content-between"><span><strong>HARGA GOFOOD:</strong></span><span><strong>{formatRupiah(calculateGoFoodPrice())}</strong></span></div>
                </div>
              </div>
              <div className="mt-3 row">
                <div className="col-md-6"><small className="text-muted"><i className="bi bi-graph-up me-1"></i>Laba: {formatRupiah(calculateGrossProfit())}</small></div>
                <div className="col-md-6 text-end"><small className="text-muted">Margin: {profitMargin}%</small></div>
              </div>
            </div>
          </div>

          {/* Save Card */}
          <div className="card shadow-sm">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">{editMode ? '✏️ Update Recipe' : '💾 Save New Recipe'}</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <h6>Langkah Penyimpanan:</h6>
                <ol className="small">
                  <li>Isi semua data dengan lengkap</li>
                  <li>Pastikan koneksi internet stabil</li>
                  <li>Klik tombol di bawah</li>
                  <li>Data akan disimpan ke 3 sheets: Summary, Ingredients, Packaging</li>
                </ol>
              </div>
              
              <div className="alert alert-info small">
                <strong><i className="bi bi-google me-1"></i>Google Sheets Structure:</strong>
                <p className="mb-0 mt-1">Data akan disimpan ke 3 sheets terpisah untuk organisasi yang lebih baik.</p>
              </div>
              
              <div className="d-grid gap-2">
                <button className={editMode ? "btn btn-warning btn-lg" : "btn btn-success btn-lg"}
                  onClick={() => saveToGoogleSheets(editMode)}
                  disabled={isLoading || !recipeName.trim() || connectionStatus !== 'connected'}>
                  {isLoading ? <><span className="spinner-border spinner-border-sm me-2"></span>{editMode ? 'Updating...' : 'Saving...'}</> : 
                   <><i className={editMode ? "bi bi-arrow-clockwise me-2" : "bi bi-save me-2"}></i>{editMode ? 'Update Recipe' : 'Save New Recipe'}</>}
                </button>
                
                <button className="btn btn-outline-primary" onClick={() => setShowHistory(!showHistory)} disabled={isLoading}>
                  <i className="bi bi-clock-history me-2"></i>{showHistory ? 'Sembunyikan' : 'Lihat'} History ({recipeHistory.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Selector Modal */}
      {showRecipeSelector && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-warning text-white">
                <h5 className="modal-title"><i className="bi bi-journal-text me-2"></i>Pilih Recipe untuk Diedit</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowRecipeSelector(false)}></button>
              </div>
              <div className="modal-body">
                {availableRecipes.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr><th>Row#</th><th>Nama Resep</th><th>Kategori</th><th>Brand</th><th>Tanggal</th><th>Aksi</th></tr>
                      </thead>
                      <tbody>
                        {availableRecipes.map((recipe) => (
                          <tr key={recipe.rowNumber || recipe.id}>
                            <td><span className="badge bg-dark">{recipe.rowNumber || recipe.id}</span></td>
                            <td><strong>{recipe.recipe_name}</strong></td>
                            <td><span className="badge bg-info">{recipe.recipe_category}</span></td>
                            <td>{recipe.brand || '-'}</td>
                            <td><small>{recipe.timestamp || 'N/A'}</small></td>
                            <td>
                              <button className="btn btn-sm btn-warning" onClick={() => loadRecipeForEditing(recipe.id, recipe.rowNumber)} disabled={isLoading}>
                                <i className="bi bi-pencil me-1"></i>Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="spinner-border text-warning mb-3" role="status"><span className="visually-hidden">Loading...</span></div>
                    <p className="text-muted">Memuat data dari Google Sheets...</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRecipeSelector(false)}>Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white"><h5 className="modal-title">📜 Local History</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowHistory(false)}></button>
              </div>
              <div className="modal-body">
                {recipeHistory.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead><tr><th>Tanggal</th><th>Nama Resep</th><th>Kategori</th><th>HPP</th><th>Harga Jual</th><th>Aksi</th></tr></thead>
                      <tbody>
                        {recipeHistory.map((recipe, index) => (
                          <tr key={index}>
                            <td><small>{recipe.timestamp}</small></td>
                            <td><strong>{recipe.recipe_name}</strong></td>
                            <td><span className="badge bg-info">{recipe.recipe_category}</span></td>
                            <td>{formatRupiah(recipe.hpp_per_piece || 0)}</td>
                            <td>{formatRupiah(recipe.gofood_price || 0)}</td>
                            <td>
                              <button className="btn btn-sm btn-outline-primary" onClick={() => loadFromCache(recipe)}>
                                <i className="bi bi-upload me-1"></i>Load
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
                    <p className="text-muted mt-3">Belum ada data tersimpan di cache lokal</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowHistory(false)}>Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-4 mb-3 text-center">
        <div className="row">
          <div className="col-md-4"><p className="small text-muted mb-1"><span className={`badge ${connectionStatus === 'connected' ? 'bg-success' : 'bg-warning'}`}>
            {connectionStatus === 'connected' ? '✅ CONNECTED' : '⚠️ CHECKING'}</span></p></div>
          <div className="col-md-4"><p className="small text-muted mb-1">Mode: <strong>{editMode ? 'EDITING' : 'CREATING NEW'}</strong></p></div>
          <div className="col-md-4"><p className="small text-muted mb-1">Sheets: <strong>3 Sheets Connected</strong></p></div>
        </div>
        <p className="small text-muted mt-2"><i className="bi bi-google me-1"></i>HPP Calculator v3.1 | 3 Sheets Integration</p>
      </footer>
    </div>
  );
};

export default App;