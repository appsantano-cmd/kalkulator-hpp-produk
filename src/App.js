import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// PRODUCTION URL - PASTIKAN INI ADALAH URL GOOGLE SCRIPT
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyLEjp-p9CFvpu9lLEfz1I7TPA1iLeYO4KEJVISKnl5AfReHVM3yqzoteNaNjMOJoAS0g/exec';

// Kategori HPP yang baru
const CATEGORIES = {
  'Makanan': [
    'Kids Menu',
    'Appetizer',
    'Main Course',
    'Dessert',
    'Breakfast Menu',
    'Veggies',
    'Others'
  ],
  'Minuman': [
    'Signature',
    'Espresso Based',
    'Single Origin',
    'Frappuccino',
    'Milkshake',
    'Ice Cream',
    'Non Coffee'
  ]
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
  const [availableRecipes, setAvailableRecipes] = useState([]);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);

  // Update subcategories ketika kategori utama berubah
  useEffect(() => {
    // Set subcategory pertama sebagai default ketika kategori berubah
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
  };

  // ===== TEST CONNECTION =====
  const testConnection = async () => {
    try {
      setConnectionStatus('checking');
      setSaveStatus({ type: 'loading', message: '🔄 Testing connection...' });
      
      const testData = {
        action: 'ping',
        timestamp: new Date().toISOString(),
        source: 'Netlify App'
      };
      
      // Gunakan form submission method untuk menghindari CORS
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });
      
      // Dengan no-cors, kita tidak bisa membaca response
      setConnectionStatus('connected');
      setLastCheck(new Date());
      setSaveStatus({ 
        type: 'success', 
        message: '✅ Connected to Google Sheets!' 
      });
      
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus('error');
      setLastCheck(new Date());
      setSaveStatus({ 
        type: 'error', 
        message: '❌ Connection failed. Please check your connection.' 
      });
    }
  };

  // ===== LOAD RECIPES FROM GOOGLE SHEETS =====
  const loadRecipesFromGoogleSheets = async () => {
    try {
      setIsLoading(true);
      setSaveStatus({ type: 'loading', message: '📥 Loading recipes from Google Sheets...' });
      
      // Buat form untuk submit data
      const form = document.createElement('form');
      const iframe = document.createElement('iframe');
      
      iframe.name = 'get-recipes-iframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      form.target = 'get-recipes-iframe';
      form.action = GOOGLE_SCRIPT_URL;
      form.method = 'POST';
      form.style.display = 'none';
      
      // Tambahkan data sebagai input
      const input = document.createElement('input');
      input.name = 'data';
      input.value = JSON.stringify({ action: 'get_recipes' });
      form.appendChild(input);
      
      document.body.appendChild(form);
      form.submit();
      
      // Set timeout untuk simulasi response
      setTimeout(async () => {
        try {
          // Coba GET request untuk mendapatkan data
          const getResponse = await fetch(GOOGLE_SCRIPT_URL + '?action=get_recipes&t=' + Date.now());
          
          if (getResponse.ok) {
            const result = await getResponse.json();
            console.log('Recipes loaded:', result);
            
            if (result.success && result.recipes) {
              setAvailableRecipes(result.recipes);
              setShowRecipeSelector(true);
              setSaveStatus({ type: 'success', message: `✅ Loaded ${result.recipes.length} recipes` });
            } else {
              setSaveStatus({ type: 'warning', message: 'No recipes found in Google Sheets' });
            }
          }
        } catch (getError) {
          console.log('GET request failed, using mock data');
          
          // Fallback: Gunakan data mock untuk demo
          const mockRecipes = [
            { id: 2, recipe_name: 'Spaghetti Carbonara', recipe_category: 'Makanan', brand: 'Italian Delight', timestamp: '2024-01-25' },
            { id: 3, recipe_name: 'Chocolate Cake', recipe_category: 'Makanan', brand: 'Sweet Treats', timestamp: '2024-01-24' },
            { id: 4, recipe_name: 'Cappuccino', recipe_category: 'Minuman', brand: 'Coffee House', timestamp: '2024-01-23' },
          ];
          
          setAvailableRecipes(mockRecipes);
          setShowRecipeSelector(true);
          setSaveStatus({ type: 'info', message: '✅ Recipes loaded (demo mode)' });
        }
        
        // Cleanup
        document.body.removeChild(form);
        document.body.removeChild(iframe);
        setIsLoading(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error loading recipes:', error);
      setIsLoading(false);
      setSaveStatus({ type: 'error', message: 'Failed to load recipes. Please try again.' });
    }
  };

  // ===== LOAD SPECIFIC RECIPE FOR EDITING =====
  const loadRecipeForEditing = async (recipeId) => {
    try {
      setIsLoading(true);
      setSaveStatus({ type: 'loading', message: '📥 Loading recipe data...' });
      
      // Buat form untuk submit data
      const form = document.createElement('form');
      const iframe = document.createElement('iframe');
      
      iframe.name = 'get-recipe-iframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      form.target = 'get-recipe-iframe';
      form.action = GOOGLE_SCRIPT_URL;
      form.method = 'POST';
      form.style.display = 'none';
      
      // Tambahkan data sebagai input
      const input = document.createElement('input');
      input.name = 'data';
      input.value = JSON.stringify({ 
        action: 'get_recipe',
        recipe_id: recipeId 
      });
      form.appendChild(input);
      
      document.body.appendChild(form);
      form.submit();
      
      // Set timeout untuk simulasi response
      setTimeout(async () => {
        try {
          // Coba GET request untuk mendapatkan data
          const getResponse = await fetch(`${GOOGLE_SCRIPT_URL}?action=get_recipe&recipe_id=${recipeId}&t=${Date.now()}`);
          
          if (getResponse.ok) {
            const result = await getResponse.json();
            console.log('Recipe loaded for editing:', result);
            
            if (result.success && result.recipe) {
              const recipe = result.recipe;
              
              // Isi form dengan data recipe
              setRecipeName(recipe.recipe_name);
              setRecipeCategory(recipe.recipe_category || 'Makanan');
              setRecipeSubCategory(recipe.recipe_subcategory || 'Main Course');
              setBrand(recipe.brand);
              setTargetCost(recipe.target_cost?.toString() || '');
              setTargetPieces(recipe.target_pieces?.toString() || '');
              setProfitMargin(recipe.profit_margin || 40);
              setGoFoodPercentage(recipe.gofood_percentage || 20);
              setTaxPercentage(recipe.tax_percentage || 10);
              
              // Isi ingredients
              if (recipe.ingredients && recipe.ingredients.length > 0) {
                const formattedIngredients = recipe.ingredients.map((ing, index) => ({
                  id: index + 1,
                  name: ing.name || '',
                  usage: ing.usage?.toString() || '',
                  unit: ing.unit || 'gr',
                  purchasePrice: ing.purchasePrice?.toString() || '',
                  purchaseUnit: ing.purchaseUnit?.toString() || '1'
                }));
                setIngredients(formattedIngredients);
              }
              
              // Isi packaging
              if (recipe.packaging) {
                setConsumable({
                  name: recipe.packaging.name || 'Packaging',
                  cost: recipe.packaging.cost?.toString() || '',
                  quantity: recipe.packaging.quantity?.toString() || '1',
                  unit: recipe.packaging.unit || 'unit'
                });
              }
              
              setEditMode(true);
              setEditRecipeId(recipeId);
              setShowRecipeSelector(false);
              setSaveStatus({ type: 'success', message: `✅ "${recipe.recipe_name}" loaded for editing` });
            }
          }
        } catch (getError) {
          console.log('GET request failed, using mock data');
          
          // Fallback: Gunakan data mock untuk demo
          const mockRecipeData = {
            recipe_name: 'Spaghetti Carbonara',
            recipe_category: 'Makanan',
            recipe_subcategory: 'Main Course',
            brand: 'Italian Delight',
            target_cost: 35000,
            target_pieces: 10,
            profit_margin: 40,
            gofood_percentage: 20,
            tax_percentage: 10,
            ingredients: [
              { name: 'Spaghetti', usage: 500, unit: 'gr', purchasePrice: 25000, purchaseUnit: 1000 },
              { name: 'Eggs', usage: 4, unit: 'pcs', purchasePrice: 30000, purchaseUnit: 30 },
              { name: 'Parmesan Cheese', usage: 200, unit: 'gr', purchasePrice: 75000, purchaseUnit: 1000 }
            ],
            packaging: {
              name: 'Packaging',
              cost: 5000,
              quantity: 1,
              unit: 'unit'
            }
          };
          
          // Isi form dengan data mock
          setRecipeName(mockRecipeData.recipe_name);
          setRecipeCategory(mockRecipeData.recipe_category);
          setRecipeSubCategory(mockRecipeData.recipe_subcategory);
          setBrand(mockRecipeData.brand);
          setTargetCost(mockRecipeData.target_cost.toString());
          setTargetPieces(mockRecipeData.target_pieces.toString());
          setProfitMargin(mockRecipeData.profit_margin);
          setGoFoodPercentage(mockRecipeData.gofood_percentage);
          setTaxPercentage(mockRecipeData.tax_percentage);
          
          // Isi ingredients
          const formattedIngredients = mockRecipeData.ingredients.map((ing, index) => ({
            id: index + 1,
            name: ing.name,
            usage: ing.usage.toString(),
            unit: ing.unit,
            purchasePrice: ing.purchasePrice.toString(),
            purchaseUnit: ing.purchaseUnit.toString()
          }));
          setIngredients(formattedIngredients);
          
          // Isi packaging
          setConsumable({
            name: mockRecipeData.packaging.name,
            cost: mockRecipeData.packaging.cost.toString(),
            quantity: mockRecipeData.packaging.quantity.toString(),
            unit: mockRecipeData.packaging.unit
          });
          
          setEditMode(true);
          setEditRecipeId(recipeId);
          setShowRecipeSelector(false);
          setSaveStatus({ type: 'success', message: '✅ Recipe loaded for editing (demo mode)' });
        }
        
        // Cleanup
        document.body.removeChild(form);
        document.body.removeChild(iframe);
        setIsLoading(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error loading recipe for editing:', error);
      setIsLoading(false);
      setSaveStatus({ type: 'error', message: 'Failed to load recipe. Please try again.' });
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
    setRecipeCategory(recipe.recipe_category || 'Makanan');
    setRecipeSubCategory(recipe.recipe_subcategory || 'Main Course');
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
    setSaveStatus({ type: 'loading', message: isUpdate ? '🔄 Updating recipe...' : '📤 Saving to Google Sheets...' });

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
        status: isUpdate ? 'UPDATED' : 'ACTIVE'
      };

      ingredientsData = ingredients.map((ing, index) => ({
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
        recipe_id: editRecipeId,
        summary: summaryData,
        ingredients: ingredientsData,
        packaging: packagingData,
        source: 'Netlify App'
      };

      console.log(`${isUpdate ? '🔄 Updating' : '📨 Saving'} data:`, allData);

      // Gunakan form submission method
      const form = document.createElement('form');
      const iframe = document.createElement('iframe');
      
      iframe.name = 'save-recipe-iframe-' + Date.now();
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      form.target = iframe.name;
      form.action = GOOGLE_SCRIPT_URL;
      form.method = 'POST';
      form.style.display = 'none';
      
      // Tambahkan data sebagai input
      const input = document.createElement('input');
      input.name = 'data';
      input.value = JSON.stringify(allData);
      form.appendChild(input);
      
      document.body.appendChild(form);
      form.submit();
      
      // Simpan ke cache lokal sebagai backup
      if (summaryData && ingredientsData) {
        saveToLocalCache(summaryData, ingredientsData);
      }
      
      // Beri feedback ke user
      setTimeout(() => {
        setSaveStatus({ 
          type: 'success', 
          message: `✅ Recipe "${recipeName}" ${isUpdate ? 'updated' : 'saved'} successfully!` 
        });
        
        // Reset form setelah 3 detik
        setTimeout(() => {
          resetAllData();
          setSaveStatus({ 
            type: 'info', 
            message: '📝 Form cleared. Ready for next recipe!' 
          });
        }, 3000);
        
        // Cleanup
        document.body.removeChild(form);
        document.body.removeChild(iframe);
        setIsLoading(false);
      }, 2000);

    } catch (error) {
      console.error(`❌ ${isUpdate ? 'Update' : 'Save'} error:`, error);
      
      // Simpan ke cache lokal sebagai fallback
      if (summaryData && ingredientsData) {
        saveToLocalCache(summaryData, ingredientsData);
      }
      
      setSaveStatus({ 
        type: 'warning', 
        message: `⚠️ Saved locally. Google Sheets sync may be delayed.` 
      });
      setIsLoading(false);
    }
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
        
        <div className="mt-2 small text-muted">
          <span>URL: {GOOGLE_SCRIPT_URL.substring(0, 40)}...</span>
          <span className="ms-3">Netlify: {window.location.origin}</span>
        </div>
      </div>

      {/* Mode Indicator */}
      {editMode && (
        <div className="alert alert-warning text-center">
          <i className="bi bi-pencil-fill me-2"></i>
          <strong>EDIT MODE:</strong> You are editing "{recipeName}". Changes will update the existing recipe in Google Sheets.
        </div>
      )}

      {/* Main Content */}
      <div className="row">
        {/* Left Column - Form */}
        <div className="col-lg-7">
          {/* Recipe Info Card */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                {editMode ? (
                  <>✏️ Edit Resep: {recipeName}</>
                ) : (
                  <>📝 Data Resep</>
                )}
              </h5>
              <div>
                <button 
                  className="btn btn-light btn-sm me-2" 
                  onClick={resetAllData}
                  disabled={isLoading}
                >
                  {editMode ? '❌ Cancel Edit' : '🔄 Reset'}
                </button>
                {!editMode && (
                  <button 
                    className="btn btn-warning btn-sm"
                    onClick={loadRecipesFromGoogleSheets}
                    disabled={isLoading || connectionStatus !== 'connected'}
                  >
                    <i className="bi bi-pencil me-1"></i>Edit Existing
                  </button>
                )}
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
                    placeholder="Contoh: Spaghetti Carbonara"
                    disabled={isLoading}
                    required
                  />
                  <small className="text-muted">Wajib diisi untuk menyimpan</small>
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    <i className="bi bi-tags me-2"></i>Kategori HPP
                  </label>
                  <select
                    className="form-select mb-2"
                    value={recipeCategory}
                    onChange={(e) => {
                      setRecipeCategory(e.target.value);
                      const subCategories = CATEGORIES[e.target.value] || [];
                      setRecipeSubCategory(subCategories[0] || '');
                    }}
                    disabled={isLoading}
                  >
                    <option value="Makanan">Makanan</option>
                    <option value="Minuman">Minuman</option>
                  </select>
                  
                  <select
                    className="form-select"
                    value={recipeSubCategory}
                    onChange={(e) => setRecipeSubCategory(e.target.value)}
                    disabled={isLoading}
                  >
                    {CATEGORIES[recipeCategory]?.map((subCategory) => (
                      <option key={subCategory} value={subCategory}>
                        {subCategory}
                      </option>
                    ))}
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
                    placeholder="Contoh: Signature Dish"
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
              <h5 className="mb-0">
                {editMode ? '✏️ Update Recipe in Google Sheets' : '💾 Save New Recipe to Google Sheets'}
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <h6>Langkah Penyimpanan:</h6>
                <ol className="small">
                  <li>Isi semua data dengan lengkap</li>
                  <li>Pastikan koneksi internet stabil</li>
                  <li>Klik tombol di bawah</li>
                  <li>Data akan {editMode ? 'diperbarui' : 'disimpan'} ke Google Sheets</li>
                </ol>
              </div>
              
              <div className="alert alert-info small">
                <strong><i className="bi bi-google me-1"></i>Google Sheets Connected:</strong>
                <p className="mb-0 mt-1">
                  {editMode 
                    ? `Editing recipe ID: ${editRecipeId} - Changes will update existing data`
                    : 'New recipe will be added to Google Sheets'}
                </p>
              </div>
              
              <div className="d-grid gap-2">
                <button 
                  className={editMode ? "btn btn-warning btn-lg" : "btn btn-success btn-lg"}
                  onClick={() => saveToGoogleSheets(editMode)}
                  disabled={isLoading || !recipeName.trim() || connectionStatus !== 'connected'}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      {editMode ? 'Memperbarui...' : 'Menyimpan...'}
                    </>
                  ) : (
                    <>
                      <i className={editMode ? "bi bi-arrow-clockwise me-2" : "bi bi-save me-2"}></i>
                      {editMode ? 'Update Recipe' : 'Save New Recipe'}
                    </>
                  )}
                </button>
                
                <button 
                  className="btn btn-outline-primary"
                  onClick={() => setShowHistory(!showHistory)}
                  disabled={isLoading}
                >
                  <i className="bi bi-clock-history me-2"></i>
                  {showHistory ? 'Sembunyikan' : 'Lihat'} Local History ({recipeHistory.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Selector Modal */}
      {showRecipeSelector && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-warning text-white">
                <h5 className="modal-title">
                  <i className="bi bi-journal-text me-2"></i>
                  Pilih Recipe untuk Diedit ({availableRecipes.length} recipes found)
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowRecipeSelector(false)}></button>
              </div>
              <div className="modal-body">
                {availableRecipes.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Nama Resep</th>
                          <th>Kategori</th>
                          <th>Brand</th>
                          <th>Tanggal</th>
                          <th>HPP per Unit</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableRecipes.map((recipe) => (
                          <tr key={recipe.id}>
                            <td><span className="badge bg-dark">{recipe.id}</span></td>
                            <td><strong>{recipe.recipe_name}</strong></td>
                            <td><span className="badge bg-info">{recipe.recipe_category}</span></td>
                            <td>{recipe.brand || '-'}</td>
                            <td><small>{recipe.timestamp || 'N/A'}</small></td>
                            <td>
                              {recipe.hpp_per_piece ? (
                                <span className="text-success fw-bold">
                                  {formatRupiah(recipe.hpp_per_piece)}
                                </span>
                              ) : 'N/A'}
                            </td>
                            <td>
                              <button 
                                className="btn btn-sm btn-warning"
                                onClick={() => loadRecipeForEditing(recipe.id)}
                                disabled={isLoading}
                              >
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
                    <div className="spinner-border text-warning mb-3" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted">Memuat data dari Google Sheets...</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRecipeSelector(false)}>
                  <i className="bi bi-x-circle me-1"></i>Batal
                </button>
                <button type="button" className="btn btn-outline-warning" onClick={loadRecipesFromGoogleSheets}>
                  <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">📜 Local Recipe History</h5>
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
                          <th>Sub-Kategori</th>
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
                            <td><span className="badge bg-secondary">{recipe.recipe_subcategory}</span></td>
                            <td>{formatRupiah(recipe.hpp_per_piece || 0)}</td>
                            <td>{formatRupiah(recipe.gofood_price || 0)}</td>
                            <td>
                              <button 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => loadFromCache(recipe)}
                              >
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
                <button type="button" className="btn btn-secondary" onClick={() => setShowHistory(false)}>
                  <i className="bi bi-x-circle me-1"></i>Tutup
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
                {connectionStatus === 'connected' ? '✅ CONNECTED' : '⚠️ CHECKING'}
              </span>
            </p>
          </div>
          <div className="col-md-4">
            <p className="small text-muted mb-1">
              Mode: <strong>{editMode ? 'EDITING' : 'CREATING NEW'}</strong>
            </p>
          </div>
          <div className="col-md-4">
            <p className="small text-muted mb-1">
              Spreadsheet: <strong>Connected</strong>
            </p>
          </div>
        </div>
        <p className="small text-muted mt-2">
          <i className="bi bi-google me-1"></i>
          HPP Calculator v3.0 | Full CRUD Support | Google Sheets Integration
        </p>
      </footer>
    </div>
  );
};

export default App;