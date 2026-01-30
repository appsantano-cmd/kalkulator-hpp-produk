import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyLEjp-p9CFvpu9lLEfz1I7TPA1iLeYO4KEJVISKnl5AfReHVM3yqzoteNaNjMOJoAS0g/exec';

const CATEGORIES = {
  'Makanan': ['Kids Menu', 'Appetizer', 'Main Course', 'Dessert', 'Breakfast Menu', 'Veggies', 'Others'],
  'Minuman': ['Signature', 'Espresso Based', 'Single Origin', 'Frappuccino', 'Milkshake', 'Ice Cream', 'Non Coffee']
};

const App = () => {
  // States
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

  const [ingredients, setIngredients] = useState([{ 
    id: 1, 
    name: '', 
    usage: '', 
    unit: 'gr', 
    purchasePrice: '', 
    purchaseUnit: '',
    purchaseUnitType: 'gr',
    category: 'Bahan Utama',
    supplier: '',
    notes: ''
  }]);
  
  const [consumable, setConsumable] = useState({ 
    name: 'Packaging', 
    cost: '', 
    quantity: '1', 
    unit: 'unit',
    type: 'Packaging'
  });
  
  const [goFoodPercentage, setGoFoodPercentage] = useState(20);
  const [taxPercentage, setTaxPercentage] = useState(10);
  const [profitMargin, setProfitMargin] = useState(40);
  
  const [recipeHistory, setRecipeHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [availableRecipes, setAvailableRecipes] = useState([]);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recipeNotes, setRecipeNotes] = useState('');

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
  const calculateTotalGrossProfit = () => calculateGrossProfit() * (parseFloat(targetPieces) || 1);
  const calculateTotalRevenue = () => calculateDineInPrice() * (parseFloat(targetPieces) || 1);

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
      unit: 'gr', 
      purchasePrice: '', 
      purchaseUnit: '',
      purchaseUnitType: 'gr',
      category: 'Bahan Utama',
      supplier: '',
      notes: ''
    }]);
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
    setIngredients([{ 
      id: 1, 
      name: '', 
      usage: '', 
      unit: 'gr', 
      purchasePrice: '', 
      purchaseUnit: '',
      purchaseUnitType: 'gr',
      category: 'Bahan Utama',
      supplier: '',
      notes: ''
    }]);
    setConsumable({ 
      name: 'Packaging', 
      cost: '', 
      quantity: '1', 
      unit: 'unit',
      type: 'Packaging'
    });
    setGoFoodPercentage(20);
    setTaxPercentage(10);
    setProfitMargin(40);
    setRecipeNotes('');
    setSaveStatus({ type: '', message: '' });
    setEditMode(false);
    setEditRecipeId(null);
  };

  // ===== CONNECTION TEST =====
  const testConnection = async () => {
    try {
      setConnectionStatus('checking');
      setSaveStatus({ type: 'loading', message: '🔄 Testing connection...' });
      
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=ping&t=${Date.now()}`);
      
      if (response.ok) {
        const result = await response.json();
        setConnectionStatus('connected');
        setLastCheck(new Date());
        setSaveStatus({ type: 'success', message: '✅ Connected to Google Sheets!' });
      } else {
        throw new Error('Connection failed');
      }
      
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus('error');
      setLastCheck(new Date());
      setSaveStatus({ type: 'warning', message: '⚠️ Connection failed. Using offline mode.' });
    }
  };

  // ===== LOAD RECIPES FROM GOOGLE SHEETS =====
  const loadRecipesFromGoogleSheets = async () => {
    try {
      setIsLoading(true);
      setSaveStatus({ type: 'loading', message: '📥 Loading recipes...' });
      
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=get_recipes&t=${Date.now()}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.recipes) {
          setAvailableRecipes(result.recipes);
          setShowRecipeSelector(true);
          setSaveStatus({ type: 'success', message: `✅ Loaded ${result.recipes.length} recipes` });
        } else {
          throw new Error('No recipes found');
        }
      } else {
        throw new Error('Network error');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Load recipes error:', error);
      setIsLoading(false);
      setSaveStatus({ type: 'warning', message: `⚠️ Failed to load recipes: ${error.message}` });
    }
  };

  // ===== LOAD SPECIFIC RECIPE FOR EDITING =====
  const loadRecipeForEditing = async (recipeId) => {
    try {
      setIsLoading(true);
      setSaveStatus({ type: 'loading', message: '📥 Loading recipe...' });
      
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=get_recipe&recipe_id=${recipeId}&t=${Date.now()}`);
      
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
          setRecipeNotes(recipe.notes || '');
          
          // Load ingredients dari sheet Ingredients
          const ingredientsResponse = await fetch(`${GOOGLE_SCRIPT_URL}?action=get_ingredients&recipe_id=${recipeId}&t=${Date.now()}`);
          if (ingredientsResponse.ok) {
            const ingredientsResult = await ingredientsResponse.json();
            if (ingredientsResult.success && ingredientsResult.ingredients && ingredientsResult.ingredients.length > 0) {
              const formattedIngredients = ingredientsResult.ingredients.map((ing, index) => ({
                id: index + 1,
                name: ing.ingredient_name || '',
                usage: ing.usage_amount?.toString() || '',
                unit: ing.usage_unit || 'gr',
                purchasePrice: ing.purchase_price?.toString() || '',
                purchaseUnit: ing.purchase_unit_amount?.toString() || '1',
                purchaseUnitType: ing.purchase_unit_type || 'gr',
                category: ing.category || 'Bahan Utama',
                supplier: ing.supplier || '',
                notes: ing.notes || ''
              }));
              setIngredients(formattedIngredients);
            }
          }
          
          // Load packaging
          const packagingResponse = await fetch(`${GOOGLE_SCRIPT_URL}?action=get_packaging&recipe_id=${recipeId}&t=${Date.now()}`);
          if (packagingResponse.ok) {
            const packagingResult = await packagingResponse.json();
            if (packagingResult.success && packagingResult.packaging) {
              setConsumable({
                name: packagingResult.packaging.name || 'Packaging',
                cost: packagingResult.packaging.cost?.toString() || '',
                quantity: packagingResult.packaging.quantity?.toString() || '1',
                unit: packagingResult.packaging.unit || 'unit',
                type: packagingResult.packaging.type || 'Packaging'
              });
            }
          }
          
          setEditMode(true);
          setEditRecipeId(recipe.id);
          setShowRecipeSelector(false);
          setSaveStatus({ type: 'success', message: `✅ "${recipe.recipe_name}" loaded for editing` });
          
        } else {
          setSaveStatus({ type: 'error', message: 'Failed to load recipe data' });
        }
      } else {
        setSaveStatus({ type: 'error', message: 'Network error loading recipe' });
      }
      
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setSaveStatus({ type: 'error', message: 'Error loading recipe: ' + error.message });
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
      const dateOnly = now.toISOString().split('T')[0];

      // Generate unique recipe ID
      const recipeId = editRecipeId || `RCP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Data untuk Sheet "Recipes"
      const recipeData = {
        recipe_id: recipeId,
        timestamp: timestamp,
        date: dateOnly,
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
        gross_profit_per_piece: calculateGrossProfit(),
        total_gross_profit: calculateTotalGrossProfit(),
        total_revenue: calculateTotalRevenue(),
        notes: recipeNotes,
        status: isUpdate ? 'UPDATED' : 'ACTIVE',
        last_updated: timestamp
      };

      // Data untuk Sheet "Ingredients"
      const ingredientsData = ingredients.map((ing, index) => ({
        recipe_id: recipeId,
        recipe_name: recipeName.trim(),
        ingredient_id: `${recipeId}_ING_${index + 1}`,
        ingredient_name: ing.name.trim(),
        usage_amount: parseFloat(ing.usage) || 0,
        usage_unit: ing.unit,
        purchase_price: parseFloat(ing.purchasePrice) || 0,
        purchase_unit_amount: parseFloat(ing.purchaseUnit) || 1,
        purchase_unit_type: ing.purchaseUnitType,
        cost_per_usage: calculateIngredientCost(ing),
        category: ing.category || 'Bahan Utama',
        supplier: ing.supplier || '',
        notes: ing.notes || '',
        timestamp: timestamp
      }));

      // Data untuk Sheet "Packaging"
      const packagingData = {
        recipe_id: recipeId,
        recipe_name: recipeName.trim(),
        packaging_id: `${recipeId}_PKG_1`,
        name: consumable.name || 'Packaging',
        cost: parseFloat(consumable.cost) || 0,
        quantity: parseFloat(consumable.quantity) || 1,
        unit: consumable.unit,
        type: consumable.type || 'Packaging',
        cost_per_unit: (parseFloat(consumable.cost) || 0) / (parseFloat(consumable.quantity) || 1),
        timestamp: timestamp
      };

      // Data untuk Sheet "Pricing"
      const pricingData = {
        recipe_id: recipeId,
        recipe_name: recipeName.trim(),
        category: recipeCategory,
        subcategory: recipeSubCategory,
        hpp_per_piece: calculateHPPPerPiece(),
        profit_margin: profitMargin,
        dine_in_price: calculateDineInPrice(),
        gofood_percentage: goFoodPercentage,
        tax_percentage: taxPercentage,
        gofood_price: calculateGoFoodPrice(),
        gross_profit_per_piece: calculateGrossProfit(),
        total_production_cost: calculateTotalProductionCost(),
        total_revenue: calculateTotalRevenue(),
        total_gross_profit: calculateTotalGrossProfit(),
        target_cost: parseFloat(targetCost) || 0,
        variance: (parseFloat(targetCost) || 0) - calculateHPPPerPiece(),
        variance_percentage: ((parseFloat(targetCost) || 0) - calculateHPPPerPiece()) / (parseFloat(targetCost) || 1) * 100,
        status: 'ACTIVE',
        last_updated: timestamp
      };

      const allData = {
        action: isUpdate ? 'update_recipe' : 'save_recipe',
        recipe_id: recipeId,
        recipe: recipeData,
        ingredients: ingredientsData,
        packaging: packagingData,
        pricing: pricingData,
        source: 'HPP Calculator Production'
      };

      // Kirim data ke Google Apps Script
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(allData)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          // Simpan ke cache lokal
          saveToLocalCache(recipeData, pricingData, ingredientsData);
          
          setSaveStatus({ 
            type: 'success', 
            message: `✅ Recipe "${recipeName}" ${isUpdate ? 'updated' : 'saved'} successfully! Saved to 4 sheets.` 
          });
          
          // Refresh recipe list jika di edit mode
          if (isUpdate) {
            setTimeout(() => {
              loadRecipesFromGoogleSheets();
            }, 1500);
          } else {
            // Reset form setelah 3 detik (hanya jika bukan update)
            setTimeout(() => {
              resetAllData();
              setSaveStatus({ type: 'info', message: '📝 Form cleared. Ready for new recipe!' });
            }, 3000);
          }
          
        } else {
          throw new Error(result.message || 'Save failed');
        }
      } else {
        throw new Error('Network error');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Save error:', error);
      
      // Simpan ke cache lokal sebagai fallback
      try {
        const now = new Date();
        const timestamp = now.toLocaleString('id-ID');
        const recipeData = {
          timestamp: timestamp,
          recipe_name: recipeName.trim(),
          recipe_category: recipeCategory,
          recipe_subcategory: recipeSubCategory,
          brand: brand.trim() || '-',
          target_cost: parseFloat(targetCost) || 0,
          target_pieces: parseFloat(targetPieces) || 0,
          hpp_per_piece: calculateHPPPerPiece(),
          profit_margin: profitMargin,
          dine_in_price: calculateDineInPrice(),
          ingredients: JSON.stringify(ingredients),
          packaging: JSON.stringify(consumable),
          status: 'CACHED_OFFLINE'
        };
        
        saveToLocalCache(recipeData, {}, ingredients);
      } catch (cacheError) {
        console.error('Cache save error:', cacheError);
      }
      
      setSaveStatus({ 
        type: 'warning', 
        message: `⚠️ Saved to local cache. Check internet connection and retry. Error: ${error.message}` 
      });
      setIsLoading(false);
    }
  };

  // ===== LOCAL CACHE =====
  const saveToLocalCache = (recipeData, pricingData, ingredientsData) => {
    try {
      const cacheData = { 
        ...recipeData, 
        ...pricingData,
        ingredients: ingredientsData || ingredients,
        packaging: consumable,
        cached_at: new Date().toISOString() 
      };
      
      const existingCache = JSON.parse(localStorage.getItem('hpp_cache') || '[]');
      
      // Hapus duplikat berdasarkan recipe_name
      const filteredCache = existingCache.filter(item => 
        item.recipe_name !== recipeData.recipe_name
      );
      
      filteredCache.unshift(cacheData);
      localStorage.setItem('hpp_cache', JSON.stringify(filteredCache.slice(0, 50)));
      setRecipeHistory(filteredCache.slice(0, 20));
    } catch (error) {
      console.error('Cache error:', error);
    }
  };

  // ===== DELETE RECIPE =====
  const deleteRecipe = async (recipeId) => {
    if (!window.confirm('Are you sure you want to delete this recipe and all related data?')) {
      return;
    }

    try {
      setIsLoading(true);
      setSaveStatus({ type: 'loading', message: '🗑️ Deleting recipe...' });

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete_recipe',
          recipe_id: recipeId,
          delete_all: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSaveStatus({ type: 'success', message: '✅ Recipe and all related data deleted successfully!' });
          
          // Refresh recipe list
          setTimeout(() => {
            loadRecipesFromGoogleSheets();
            if (editMode && editRecipeId === recipeId) {
              resetAllData();
            }
          }, 1000);
        } else {
          throw new Error(result.message || 'Delete failed');
        }
      } else {
        throw new Error('Network error');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Delete error:', error);
      setSaveStatus({ type: 'error', message: `❌ Delete failed: ${error.message}` });
      setIsLoading(false);
    }
  };

  // ===== INITIAL LOAD =====
  useEffect(() => {
    testConnection();
    const cached = JSON.parse(localStorage.getItem('hpp_cache') || '[]');
    setRecipeHistory(cached);
  }, []);

  // ===== RENDER =====
  return (
    <div className="container mt-3">
      {/* Header */}
      <div className="header-section text-center mb-4">
        <h1 className="text-primary">🚀 HPP Calculator - Complete Data Storage</h1>
        <p className="text-muted">Connected to Google Sheets (4 Sheets: Recipes, Ingredients, Packaging & Pricing)</p>
        
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
          <span className="badge bg-info me-2">Recipes</span>
          <span className="badge bg-success me-2">Ingredients</span>
          <span className="badge bg-warning me-2">Packaging</span>
          <span className="badge bg-purple me-2">Pricing</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="row">
        {/* Left Column - Form */}
        <div className="col-lg-8">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">{editMode ? '✏️ Edit Recipe' : '📝 New Recipe'}</h5>
              <div>
                <button className="btn btn-light btn-sm me-2" onClick={resetAllData} disabled={isLoading}>
                  {editMode ? '❌ Cancel Edit' : '🔄 Reset Form'}
                </button>
                <button className="btn btn-warning btn-sm" onClick={loadRecipesFromGoogleSheets} disabled={isLoading}>
                  <i className="bi bi-pencil me-1"></i>{editMode ? 'Load Another' : 'Edit Existing'}
                </button>
              </div>
            </div>
            <div className="card-body">
              {/* Basic Info */}
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

              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label"><i className="bi bi-shop me-2"></i>Nama Produk / Brand</label>
                  <input type="text" className="form-control" value={brand} 
                    onChange={(e) => setBrand(e.target.value)} placeholder="Contoh: Signature Dish" disabled={isLoading} />
                </div>
                <div className="col-md-3">
                  <label className="form-label"><i className="bi bi-bullseye me-2"></i>Target Biaya</label>
                  <div className="input-group">
                    <span className="input-group-text">Rp</span>
                    <input type="number" className="form-control" value={targetCost} 
                      onChange={(e) => setTargetCost(e.target.value)} placeholder="Target" min="0" step="100" disabled={isLoading} />
                  </div>
                </div>
                <div className="col-md-3">
                  <label className="form-label"><i className="bi bi-box-seam me-2"></i>Jumlah Produksi</label>
                  <div className="input-group">
                    <input type="number" className="form-control" value={targetPieces} 
                      onChange={(e) => setTargetPieces(e.target.value)} placeholder="Jumlah" min="1" step="1" disabled={isLoading} />
                    <span className="input-group-text">pcs</span>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label"><i className="bi bi-sticky me-2"></i>Catatan Resep</label>
                <textarea className="form-control" rows="2" value={recipeNotes}
                  onChange={(e) => setRecipeNotes(e.target.value)} 
                  placeholder="Catatan tambahan mengenai resep..." disabled={isLoading} />
              </div>
            </div>
          </div>

          {/* Ingredients Card */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">🥕 Bahan Baku ({ingredients.length}) - Akan disimpan di Sheet "Ingredients"</h5>
              <button className="btn btn-light btn-sm" onClick={addIngredient} disabled={isLoading}>
                <i className="bi bi-plus-circle me-1"></i>Tambah Bahan
              </button>
            </div>
            <div className="card-body">
              {ingredients.map((ingredient, index) => (
                <div key={ingredient.id} className="ingredient-card mb-3 p-3 border rounded">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0">
                      <span className="badge bg-secondary me-2">{index + 1}</span>
                      {ingredient.name || 'Bahan Baru'}
                      {ingredient.category && <span className="badge bg-info ms-2">{ingredient.category}</span>}
                    </h6>
                    {ingredients.length > 1 && (
                      <button className="btn btn-outline-danger btn-sm" onClick={() => removeIngredient(ingredient.id)} disabled={isLoading}>
                        <i className="bi bi-trash"></i>
                      </button>
                    )}
                  </div>
                  
                  <div className="row g-2">
                    <div className="col-md-3">
                      <label className="form-label small">Nama Bahan *</label>
                      <input type="text" className="form-control form-control-sm" value={ingredient.name} 
                        onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)} 
                        placeholder="Tepung Terigu" disabled={isLoading} required />
                    </div>
                    
                    <div className="col-md-2">
                      <label className="form-label small">Kategori</label>
                      <select className="form-select form-select-sm" value={ingredient.category}
                        onChange={(e) => updateIngredient(ingredient.id, 'category', e.target.value)} disabled={isLoading}>
                        <option value="Bahan Utama">Bahan Utama</option>
                        <option value="Bahan Tambahan">Bahan Tambahan</option>
                        <option value="Bumbu">Bumbu</option>
                        <option value="Bahan Pelengkap">Bahan Pelengkap</option>
                        <option value="Kemasan">Kemasan</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    
                    <div className="col-md-2">
                      <label className="form-label small">Jumlah Pakai *</label>
                      <div className="input-group input-group-sm">
                        <input type="number" className="form-control" value={ingredient.usage} 
                          onChange={(e) => updateIngredient(ingredient.id, 'usage', e.target.value)} 
                          placeholder="360" step="0.01" min="0" disabled={isLoading} required />
                        <select className="form-select" style={{ width: '80px' }} value={ingredient.unit} 
                          onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)} disabled={isLoading}>
                          <option value="gr">gr</option>
                          <option value="ml">ml</option>
                          <option value="kg">kg</option>
                          <option value="pcs">pcs</option>
                          <option value="sdm">sdm</option>
                          <option value="sdt">sdt</option>
                          <option value="liter">liter</option>
                          <option value="buah">buah</option>
                          <option value="lembar">lembar</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="col-md-2">
                      <label className="form-label small">Harga Beli *</label>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text">Rp</span>
                        <input type="number" className="form-control" value={ingredient.purchasePrice} 
                          onChange={(e) => updateIngredient(ingredient.id, 'purchasePrice', e.target.value)} 
                          placeholder="25000" step="100" min="0" disabled={isLoading} required />
                      </div>
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label small">Satuan Beli *</label>
                      <div className="input-group input-group-sm">
                        <input type="number" className="form-control" value={ingredient.purchaseUnit} 
                          onChange={(e) => updateIngredient(ingredient.id, 'purchaseUnit', e.target.value)} 
                          placeholder="1000" step="0.01" min="0.01" disabled={isLoading} required />
                        <select className="form-select" style={{ width: '100px' }} value={ingredient.purchaseUnitType}
                          onChange={(e) => updateIngredient(ingredient.id, 'purchaseUnitType', e.target.value)} disabled={isLoading}>
                          <option value="gr">gr</option>
                          <option value="ml">ml</option>
                          <option value="kg">kg</option>
                          <option value="pcs">pcs</option>
                          <option value="liter">liter</option>
                          <option value="pack">pack</option>
                          <option value="box">box</option>
                          <option value="dus">dus</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="row g-2 mt-2">
                    <div className="col-md-6">
                      <label className="form-label small">Supplier</label>
                      <input type="text" className="form-control form-control-sm" value={ingredient.supplier} 
                        onChange={(e) => updateIngredient(ingredient.id, 'supplier', e.target.value)} 
                        placeholder="Nama supplier" disabled={isLoading} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small">Catatan Bahan</label>
                      <input type="text" className="form-control form-control-sm" value={ingredient.notes} 
                        onChange={(e) => updateIngredient(ingredient.id, 'notes', e.target.value)} 
                        placeholder="Catatan khusus" disabled={isLoading} />
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <small className="text-success">
                      <i className="bi bi-calculator me-1"></i>
                      Biaya penggunaan: <strong>{formatRupiah(calculateIngredientCost(ingredient))}</strong>
                      <span className="ms-3">
                        Konversi: {ingredient.usage || 0} {ingredient.unit} = {((parseFloat(ingredient.usage) || 0)/(parseFloat(ingredient.purchaseUnit) || 1)).toFixed(2)} satuan beli
                      </span>
                    </small>
                  </div>
                </div>
              ))}
              
              <div className="mt-3">
                <small className="text-muted">
                  <i className="bi bi-info-circle me-1"></i>
                  Total semua bahan: <strong>{formatRupiah(calculateTotalMaterialCost())}</strong>
                  <span className="ms-3">Jumlah bahan: {ingredients.length} item</span>
                </small>
              </div>
            </div>
          </div>

          {/* Packaging Card */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-warning text-white">
              <h5 className="mb-0">📦 Biaya Packaging - Akan disimpan di Sheet "Packaging"</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label"><i className="bi bi-box me-2"></i>Nama Packaging</label>
                  <input type="text" className="form-control" value={consumable.name} 
                    onChange={(e) => setConsumable({...consumable, name: e.target.value})} 
                    placeholder="Contoh: Box Makanan" disabled={isLoading} />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label"><i className="bi bi-cash me-2"></i>Total Biaya</label>
                  <div className="input-group">
                    <span className="input-group-text">Rp</span>
                    <input type="number" className="form-control" value={consumable.cost} 
                      onChange={(e) => setConsumable({...consumable, cost: e.target.value})} 
                      placeholder="5000" min="0" step="100" disabled={isLoading} />
                  </div>
                </div>
                <div className="col-md-2 mb-3">
                  <label className="form-label"><i className="bi bi-123 me-2"></i>Quantity</label>
                  <input type="number" className="form-control" value={consumable.quantity} 
                    onChange={(e) => setConsumable({...consumable, quantity: e.target.value})} 
                    placeholder="1" min="1" step="1" disabled={isLoading} />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label"><i className="bi bi-rulers me-2"></i>Unit</label>
                  <select className="form-select" value={consumable.unit}
                    onChange={(e) => setConsumable({...consumable, unit: e.target.value})} disabled={isLoading}>
                    <option value="unit">unit</option>
                    <option value="pack">pack</option>
                    <option value="set">set</option>
                    <option value="roll">roll</option>
                    <option value="meter">meter</option>
                    <option value="pcs">pcs</option>
                  </select>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6">
                  <label className="form-label"><i className="bi bi-tag me-2"></i>Jenis Packaging</label>
                  <select className="form-select" value={consumable.type}
                    onChange={(e) => setConsumable({...consumable, type: e.target.value})} disabled={isLoading}>
                    <option value="Packaging">Packaging</option>
                    <option value="Label">Label</option>
                    <option value="Sticker">Sticker</option>
                    <option value="Plastik">Plastik</option>
                    <option value="Paper Bag">Paper Bag</option>
                    <option value="Box">Box</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <div className="alert alert-light mt-4">
                    <small>
                      <i className="bi bi-info-circle me-1"></i>
                      Biaya per unit: <strong>
                        {formatRupiah((parseFloat(consumable.cost) || 0) / (parseFloat(consumable.quantity) || 1))}
                      </strong>
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Results & Save */}
        <div className="col-lg-4">
          {/* Cost Summary */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">📊 Ringkasan Biaya</h5>
            </div>
            <div className="card-body">
              <div className="summary-item mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span>Total Biaya Bahan:</span>
                  <span className="fw-bold text-success">{formatRupiah(calculateTotalMaterialCost())}</span>
                </div>
                <small className="text-muted">{ingredients.length} bahan</small>
              </div>
              
              <div className="summary-item mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span>Biaya Packaging:</span>
                  <span className="fw-bold text-warning">{formatRupiah(parseFloat(consumable.cost) || 0)}</span>
                </div>
                <small className="text-muted">{consumable.quantity} {consumable.unit} ({consumable.name})</small>
              </div>
              
              <div className="summary-item mb-3 p-2 bg-light rounded">
                <div className="d-flex justify-content-between mb-1">
                  <span>Total Biaya Produksi:</span>
                  <span className="fw-bold text-primary">{formatRupiah(calculateTotalProductionCost())}</span>
                </div>
                <small className="text-muted">Untuk {targetPieces || 1} unit produksi</small>
              </div>
              
              <hr />
              
              <div className="result-box p-3 bg-success text-white rounded mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <h6 className="mb-0">HPP per Unit:</h6>
                  <h4 className="mb-0">{formatRupiah(calculateHPPPerPiece())}</h4>
                </div>
                <small>Biaya per porsi</small>
              </div>
              
              {targetCost && (
                <div className="result-box p-3 bg-light rounded">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <h6 className="mb-0">Selisih Target:</h6>
                    <h5 className="mb-0" style={{color: (parseFloat(targetCost) || 0) >= calculateHPPPerPiece() ? 'green' : 'red'}}>
                      {formatRupiah((parseFloat(targetCost) || 0) - calculateHPPPerPiece())}
                    </h5>
                  </div>
                  <small className="text-muted">
                    {(parseFloat(targetCost) || 0) >= calculateHPPPerPiece() ? '✅ Menguntungkan' : '⚠️ Perlu penyesuaian'}
                    {targetCost && calculateHPPPerPiece() > 0 && (
                      <span className="ms-2">
                        ({((((parseFloat(targetCost) || 0) - calculateHPPPerPiece()) / calculateHPPPerPiece()) * 100).toFixed(1)}%)
                      </span>
                    )}
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
                  <label className="form-label small">Margin Profit (%)</label>
                  <div className="input-group input-group-sm mb-2">
                    <input type="number" className="form-control" value={profitMargin} 
                      onChange={(e) => setProfitMargin(e.target.value)} 
                      placeholder="40" min="0" max="100" step="1" disabled={isLoading} />
                    <span className="input-group-text">%</span>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Biaya Platform (%)</label>
                  <div className="input-group input-group-sm mb-2">
                    <input type="number" className="form-control" value={goFoodPercentage} 
                      onChange={(e) => setGoFoodPercentage(e.target.value)} 
                      placeholder="20" min="0" max="100" step="1" disabled={isLoading} />
                    <span className="input-group-text">%</span>
                  </div>
                </div>
              </div>
              
              <div className="row mb-2">
                <div className="col-md-12">
                  <label className="form-label small">Pajak (%)</label>
                  <div className="input-group input-group-sm mb-2">
                    <input type="number" className="form-control" value={taxPercentage} 
                      onChange={(e) => setTaxPercentage(e.target.value)} 
                      placeholder="10" min="0" max="100" step="1" disabled={isLoading} />
                    <span className="input-group-text">%</span>
                  </div>
                </div>
              </div>
              
              <div className="price-results">
                <div className="price-item mb-2 p-2 bg-light rounded">
                  <div className="d-flex justify-content-between">
                    <span>Harga Dine In:</span>
                    <span className="fw-bold text-primary">{formatRupiah(calculateDineInPrice())}</span>
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
                    Laba/unit: {formatRupiah(calculateGrossProfit())}
                  </small>
                </div>
                <div className="col-md-6 text-end">
                  <small className="text-muted">
                    Total Laba: {formatRupiah(calculateTotalGrossProfit())}
                  </small>
                </div>
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
                <h6>Data yang akan disimpan:</h6>
                <div className="small">
                  <div className="d-flex align-items-center mb-1">
                    <span className="badge bg-info me-2">📋</span>
                    <span>Sheet "Recipes": Data utama resep</span>
                  </div>
                  <div className="d-flex align-items-center mb-1">
                    <span className="badge bg-success me-2">🥕</span>
                    <span>Sheet "Ingredients": {ingredients.length} bahan baku</span>
                  </div>
                  <div className="d-flex align-items-center mb-1">
                    <span className="badge bg-warning me-2">📦</span>
                    <span>Sheet "Packaging": Data packaging</span>
                  </div>
                  <div className="d-flex align-items-center mb-1">
                    <span className="badge bg-purple me-2">💰</span>
                    <span>Sheet "Pricing": Data harga & margin</span>
                  </div>
                </div>
              </div>
              
              <div className="alert alert-info small mb-3">
                <strong><i className="bi bi-google me-1"></i>Struktur Google Sheets:</strong>
                <p className="mb-0 mt-1">Data akan tersimpan di 4 sheet terpisah untuk organisasi yang lebih baik.</p>
              </div>
              
              <div className="d-grid gap-2">
                <button className={editMode ? "btn btn-warning btn-lg" : "btn btn-success btn-lg"}
                  onClick={() => saveToGoogleSheets(editMode)}
                  disabled={isLoading || !recipeName.trim()}>
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      {editMode ? 'Updating...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <i className={editMode ? "bi bi-arrow-clockwise me-2" : "bi bi-save me-2"}></i>
                      {editMode ? 'Update Recipe' : 'Save Recipe to Google Sheets'}
                    </>
                  )}
                </button>
                
                <button className="btn btn-outline-primary" onClick={() => setShowHistory(!showHistory)} disabled={isLoading}>
                  <i className="bi bi-clock-history me-2"></i>
                  {showHistory ? 'Sembunyikan' : 'Lihat'} History ({recipeHistory.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-4 mb-3 text-center">
        <div className="row">
          <div className="col-md-3">
            <p className="small text-muted mb-1">
              Status: <span className={`badge ${connectionStatus === 'connected' ? 'bg-success' : 'bg-warning'}`}>
                {connectionStatus === 'connected' ? '✅ CONNECTED' : '⚠️ CHECKING'}
              </span>
            </p>
          </div>
          <div className="col-md-3">
            <p className="small text-muted mb-1">
              Mode: <strong>{editMode ? 'EDITING' : 'NEW RECIPE'}</strong>
            </p>
          </div>
          <div className="col-md-3">
            <p className="small text-muted mb-1">
              Sheets: <strong>4 Sheets</strong>
            </p>
          </div>
          <div className="col-md-3">
            <p className="small text-muted mb-1">
              Bahan: <strong>{ingredients.length} items</strong>
            </p>
          </div>
        </div>
        <p className="small text-muted mt-2">
          <i className="bi bi-google me-1"></i>HPP Calculator v5.0 | 4 Sheets Integration | Complete Data Storage
        </p>
      </footer>

      {/* Recipe Selector Modal */}
      {showRecipeSelector && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-warning text-white">
                <h5 className="modal-title"><i className="bi bi-journal-text me-2"></i>Select Recipe to Edit ({availableRecipes.length} found)</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowRecipeSelector(false)}></button>
              </div>
              <div className="modal-body">
                {availableRecipes.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover table-sm">
                      <thead className="table-light">
                        <tr>
                          <th>Recipe Name</th>
                          <th>Category</th>
                          <th>Brand</th>
                          <th>HPP/Unit</th>
                          <th>Dine In Price</th>
                          <th>Last Updated</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableRecipes.map((recipe) => (
                          <tr key={recipe.id}>
                            <td>
                              <strong>{recipe.recipe_name}</strong>
                              {recipe.notes && (
                                <div><small className="text-muted">{recipe.notes}</small></div>
                              )}
                            </td>
                            <td>
                              <span className="badge bg-info me-1">{recipe.recipe_category}</span>
                              <small>{recipe.recipe_subcategory}</small>
                            </td>
                            <td>{recipe.brand || '-'}</td>
                            <td className="text-success">{formatRupiah(recipe.hpp_per_piece || 0)}</td>
                            <td className="text-primary">{formatRupiah(recipe.dine_in_price || 0)}</td>
                            <td>
                              <small>{recipe.last_updated || recipe.timestamp || 'N/A'}</small>
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <button className="btn btn-warning" onClick={() => loadRecipeForEditing(recipe.id)} disabled={isLoading}>
                                  <i className="bi bi-pencil me-1"></i>Edit
                                </button>
                                <button className="btn btn-outline-danger" onClick={() => deleteRecipe(recipe.id)} disabled={isLoading}>
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
                    <div className="spinner-border text-warning mb-3" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted">Loading recipes from Google Sheets...</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRecipeSelector(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;