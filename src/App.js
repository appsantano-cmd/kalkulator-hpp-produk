import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// PRODUCTION URL - Ganti dengan URL deploy terbaru Anda
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyxp4aKbxeQxuQ2aqc2ayqlkple4i7tasT0DvNOyTkDsubE8hptnF4Y5zgW6J-ZPQLrvw/exec';

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

  // ===== TEST CONNECTION - IMPROVED =====
  const testConnection = async () => {
    try {
      setConnectionStatus('checking');
      setSaveStatus({ type: 'loading', message: '🔄 Testing connection to Google Sheets...' });
      
      console.log('Testing connection to:', GOOGLE_SCRIPT_URL);
      console.log('Netlify URL:', window.location.origin);
      
      // Coba multiple approaches
      const testData = {
        action: 'test_connection',
        timestamp: new Date().toISOString(),
        source: 'Netlify App',
        url: window.location.origin
      };
      
      // Approach 1: POST dengan JSON
      let response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });
      
      // Approach 2: Jika gagal, coba GET dulu
      if (!response.ok) {
        console.log('POST failed, trying GET...');
        response = await fetch(GOOGLE_SCRIPT_URL);
      }
      
      if (response.ok) {
        const result = await response.json();
        console.log('Connection test result:', result);
        
        setConnectionStatus('connected');
        setLastCheck(new Date());
        
        if (result.success) {
          setSaveStatus({ 
            type: 'success', 
            message: `✅ Connected! Spreadsheet: ${result.data?.spreadsheetName || 'Active'}` 
          });
        } else {
          setSaveStatus({ 
            type: 'warning', 
            message: `⚠️ Connected but: ${result.message}` 
          });
        }
        
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus('error');
      setLastCheck(new Date());
      
      // Cek apakah ini error CORS atau network
      let errorMessage = 'Connection failed: ';
      
      if (error.message.includes('Failed to fetch')) {
        errorMessage += 'Network error. Check: 1. Internet connection 2. Google Script URL 3. CORS settings';
      } else if (error.message.includes('CORS')) {
        errorMessage += 'CORS error. The Google Script needs proper CORS headers.';
      } else {
        errorMessage += error.message;
      }
      
      setSaveStatus({ 
        type: 'error', 
        message: `❌ ${errorMessage}` 
      });
      
      // Fallback: Coba ping endpoint
      try {
        const pingResponse = await fetch(`${GOOGLE_SCRIPT_URL}?ping=${Date.now()}`);
        console.log('Ping response status:', pingResponse.status);
      } catch (pingError) {
        console.log('Ping also failed:', pingError);
      }
    }
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

    try {
      // Prepare data
      const now = new Date();
      const timestamp = now.toLocaleString('id-ID');

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
        source: 'Netlify'
      };

      console.log('Sending data:', allData);

      // Send to Google Sheets
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(allData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Save result:', result);
      
      if (result.success) {
        setSaveStatus({ 
          type: 'success', 
          message: `✅ "${result.data?.recipeName || recipeName}" saved to Google Sheets!` 
        });
        
        // Save to local cache
        saveToLocalCache(summaryData, ingredientsData);
        
        // Reset form
        setTimeout(() => {
          resetAllData();
          setSaveStatus({ 
            type: 'info', 
            message: '📝 Form cleared. Ready for next recipe!' 
          });
        }, 3000);
        
      } else {
        throw new Error(result.message || 'Save failed');
      }

    } catch (error) {
      console.error('Save error:', error);
      
      let errorMessage = '❌ Save failed: ';
      if (error.message.includes('Failed to fetch')) {
        errorMessage += 'Network error. Please check your connection.';
      } else {
        errorMessage += error.message;
      }
      
      setSaveStatus({ type: 'error', message: errorMessage });
      
      // Fallback to localStorage
      try {
        const backupData = {
          timestamp: new Date().toLocaleString('id-ID'),
          recipe_name: recipeName.trim(),
          recipe_category: recipeCategory,
          summary: summaryData,
          ingredients: ingredientsData,
          error: error.message,
          saved_locally: true
        };
        
        const existing = JSON.parse(localStorage.getItem('hpp_backup') || '[]');
        existing.unshift(backupData);
        localStorage.setItem('hpp_backup', JSON.stringify(existing.slice(0, 10)));
        
        setSaveStatus(prev => ({
          ...prev,
          message: prev.message + ' (Saved locally as backup)'
        }));
      } catch (localError) {
        console.error('Local save also failed:', localError);
      }
    } finally {
      setIsLoading(false);
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

      {/* Main Content - SAMA DENGAN SEBELUMNYA */}
      {/* ... (kode form tetap sama) ... */}
      
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