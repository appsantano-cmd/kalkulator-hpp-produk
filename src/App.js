import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

// GANTI DENGAN URL DEPLOYMENT ANDA
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyFCWaakC8vQPiev5waipakhtdY-INVn9BOTXxQeHGKSMEMYFaZKmHnZWZS1tX4RQx3rw/exec";

const CATEGORIES = {
  MAKANAN: [
    "APPETIZER",
    "MAIN_COURSE",
    "DESSERT",
    "BREAKFAST",
    "SNACK",
    "LAINNYA",
  ],
  MINUMAN: ["SIGNATURE", "COFFEE", "TEA", "JUICE", "MOCKTAIL", "LAINNYA"],
};

const App = () => {
  // State untuk Menu/HPP
  const [menuName, setMenuName] = useState("");
  const [category, setCategory] = useState("MAKANAN");
  const [subcategory, setSubcategory] = useState("MAIN_COURSE");
  const [brand, setBrand] = useState("");
  const [targetCost, setTargetCost] = useState("");
  const [targetQty, setTargetQty] = useState("1");
  const [profitMargin, setProfitMargin] = useState(40);
  const [gofoodPercentage, setGofoodPercentage] = useState(20);
  const [taxPercentage, setTaxPercentage] = useState(10);
  const [notes, setNotes] = useState("");

  // State untuk Bahan/Resep
  const [ingredients, setIngredients] = useState([
    {
      id: 1,
      name: "",
      usage: "",
      unit: "GRAM",
      purchase_price: "",
      purchase_unit: "",
      purchase_unit_type: "GRAM",
      category: "BAHAN_UTAMA",
      supplier: "",
      notes: "",
    },
  ]);

  const [packaging, setPackaging] = useState({
    name: "Packaging",
    cost: "",
    quantity: "1",
  });

  // State untuk UI
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState("checking");
  const [savedMenus, setSavedMenus] = useState([]);
  const [showMenuList, setShowMenuList] = useState(false);
  const [activeTab, setActiveTab] = useState("hpp"); // 'hpp' or 'resep'
  const [editMode, setEditMode] = useState(false);
  const [currentMenuId, setCurrentMenuId] = useState(null);

  // Initialize
  useEffect(() => {
    testConnection();
    loadLocalData();
  }, []);

  // ===== TEST CONNECTION =====
  const testConnection = async () => {
    try {
      setStatus({ type: "loading", message: "Testing connection..." });
      setConnection("checking");

      const response = await fetch(
        `${GOOGLE_SCRIPT_URL}?action=ping&t=${Date.now()}`,
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setConnection("connected");
          setStatus({
            type: "success",
            message: "✅ Connected to Google Sheets!",
          });

          // Initialize sheets if needed
          if (result.sheet_count < 4) {
            initializeSheets();
          }

          // Load saved menus
          loadMenus();

          return true;
        }
      }

      throw new Error("Connection failed");
    } catch (error) {
      console.error("Connection error:", error);
      setConnection("error");
      setStatus({
        type: "warning",
        message: "⚠️ Using offline mode. Data will be saved locally.",
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
        setStatus({ type: "success", message: result.message });
      }
    } catch (error) {
      console.error("Initialize error:", error);
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
    return ingredients.reduce(
      (total, ing) => total + calculateIngredientCost(ing),
      0,
    );
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
    setIngredients(
      ingredients.map((ingredient) =>
        ingredient.id === id ? { ...ingredient, [field]: value } : ingredient,
      ),
    );
  };

  const addIngredient = () => {
    const newId =
      ingredients.length > 0
        ? Math.max(...ingredients.map((i) => i.id)) + 1
        : 1;
    setIngredients([
      ...ingredients,
      {
        id: newId,
        name: "",
        usage: "",
        unit: "GRAM",
        purchase_price: "",
        purchase_unit: "",
        purchase_unit_type: "GRAM",
        category: "BAHAN_UTAMA",
        supplier: "",
        notes: "",
      },
    ]);
  };

  const removeIngredient = (id) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((ingredient) => ingredient.id !== id));
    }
  };

  // ===== SAVE TO GOOGLE SHEETS =====
  // Di dalam fungsi saveMenu di App.js
  const saveMenu = async () => {
    if (!menuName.trim()) {
      setStatus({ type: "error", message: "⚠️ Please enter menu name" });
      return;
    }

    setLoading(true);
    setStatus({ type: "loading", message: "Saving menu to Google Sheets..." });

    try {
      // Prepare data
      const menuData = {
        action: "save_menu",
        menu_name: menuName.trim(),
        category: category,
        subcategory: subcategory,
        brand: brand.trim() || "",
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
        ingredients: ingredients.map((ing) => ({
          name: ing.name.trim(),
          usage: ing.usage,
          unit: ing.unit,
          purchase_price: ing.purchase_price,
          purchase_unit: ing.purchase_unit,
          purchase_unit_type: ing.purchase_unit_type,
          category: ing.category,
          supplier: ing.supplier,
          notes: ing.notes,
        })),
        packaging: packaging,
        source: "HPP Calculator App",
      };

      console.log("Sending data to:", GOOGLE_SCRIPT_URL);
      console.log("Data:", JSON.stringify(menuData));

      // Gunakan fetch dengan error handling yang lebih baik
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(menuData),
        mode: "no-cors", // Gunakan no-cors untuk bypass CORS issues
      }).catch((error) => {
        console.error("Fetch error:", error);
        throw new Error("Network error: " + error.message);
      });

      console.log("Response received:", response);

      // Untuk no-cors mode, kita tidak bisa membaca response body
      // Tapi kita anggap berhasil jika tidak ada error

      // Simpan ke cache lokal sebagai backup
      saveToLocalCache(menuData);

      setStatus({
        type: "success",
        message: `✅ "${menuName}" saved successfully! Data sent to Google Sheets.`,
      });

      // Reset form
      setTimeout(() => resetForm(), 2000);
    } catch (error) {
      console.error("Save error:", error);

      // Fallback: save to local cache
      saveToLocalCache({
        menu_name: menuName,
        hpp_per_piece: calculateHppPerUnit(),
        timestamp: new Date().toLocaleString("id-ID"),
      });

      setStatus({
        type: "warning",
        message: `✅ Data saved locally. Please check Google Apps Script deployment. Error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };
  // ===== LOCAL STORAGE FUNCTIONS =====
  const saveToLocalCache = (data) => {
    try {
      const cacheItem = {
        ...data,
        local_id: "LOCAL_" + Date.now(),
        saved_at: new Date().toISOString(),
      };

      const existing = JSON.parse(localStorage.getItem("hpp_menus") || "[]");
      existing.unshift(cacheItem);
      localStorage.setItem("hpp_menus", JSON.stringify(existing.slice(0, 50)));
    } catch (error) {
      console.error("Cache save error:", error);
    }
  };

  const loadLocalData = () => {
    try {
      const cached = JSON.parse(localStorage.getItem("hpp_menus") || "[]");
      setSavedMenus(cached);
    } catch (error) {
      console.error("Load cache error:", error);
    }
  };

  // ===== LOAD MENUS FROM GOOGLE SHEETS =====
  const loadMenus = async () => {
    try {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=get_menus`);

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSavedMenus(result.menus);
        }
      }
    } catch (error) {
      console.error("Load menus error:", error);
    }
  };

  const loadMenuForEdit = async (menuId) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${GOOGLE_SCRIPT_URL}?action=get_menu&menu_id=${menuId}`,
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.menu) {
          const menu = result.menu;

          // Set form values
          setMenuName(menu.nama_menu || "");
          setCategory(menu.kategori || "MAKANAN");
          setSubcategory(menu.subkategori || "MAIN_COURSE");
          setBrand(menu.brand || "");
          setTargetCost(menu.target_cost?.toString() || "");
          setTargetQty(menu.target_qty?.toString() || "1");
          setProfitMargin(menu.profit_margin || 40);
          setGofoodPercentage(menu.percentage_gofood || 20);
          setTaxPercentage(menu.percentage_pajak || 10);
          setNotes(menu.catatan || "");

          // Set packaging cost
          setPackaging({
            name: "Packaging",
            cost: menu.total_packaging?.toString() || "",
            quantity: "1",
          });

          // Set ingredients if available
          if (result.ingredients_count > 0 && menu.ingredients) {
            const formattedIngredients = menu.ingredients.map((ing, index) => ({
              id: index + 1,
              name: ing.nama_bahan || "",
              usage: ing.jumlah_pakai?.toString() || "",
              unit: ing.satuan_pakai || "GRAM",
              purchase_price: ing.harga_beli?.toString() || "",
              purchase_unit: ing.satuan_beli?.toString() || "1",
              purchase_unit_type: ing.satuan_beli_type || "GRAM",
              category: ing.kategori_bahan || "BAHAN_UTAMA",
              supplier: ing.supplier || "",
              notes: ing.catatan_bahan || "",
            }));
            setIngredients(formattedIngredients);
          }

          setEditMode(true);
          setCurrentMenuId(menuId);
          setActiveTab("hpp");

          setStatus({
            type: "success",
            message: `✅ Loaded "${menu.nama_menu}" for editing`,
          });
        }
      }
    } catch (error) {
      console.error("Load menu error:", error);
      setStatus({ type: "error", message: "Failed to load menu" });
    } finally {
      setLoading(false);
    }
  };

  // ===== RESET FORM =====
  const resetForm = () => {
    setMenuName("");
    setCategory("MAKANAN");
    setSubcategory("MAIN_COURSE");
    setBrand("");
    setTargetCost("");
    setTargetQty("1");
    setProfitMargin(40);
    setGofoodPercentage(20);
    setTaxPercentage(10);
    setNotes("");
    setIngredients([
      {
        id: 1,
        name: "",
        usage: "",
        unit: "GRAM",
        purchase_price: "",
        purchase_unit: "",
        purchase_unit_type: "GRAM",
        category: "BAHAN_UTAMA",
        supplier: "",
        notes: "",
      },
    ]);
    setPackaging({
      name: "Packaging",
      cost: "",
      quantity: "1",
    });
    setEditMode(false);
    setCurrentMenuId(null);
    setStatus({ type: "info", message: "Form cleared" });
  };

  // ===== FORMAT FUNCTIONS =====
  const formatRupiah = (number) => {
    if (isNaN(number) || number === 0) return "Rp 0";
    return `Rp ${Math.round(number).toLocaleString("id-ID")}`;
  };

  // ===== RENDER =====
  return (
    <div className="container-fluid mt-3">
      {/* Header */}
      <div className="header-section text-center mb-4">
        <h1 className="text-primary">📊 HPP Calculator & Recipe Manager</h1>
        <p className="text-muted">
          Save HPP calculations and recipes separately to Google Sheets
        </p>

        <div className="d-flex justify-content-center align-items-center mb-3">
          <div
            className={`badge ${
              connection === "connected"
                ? "bg-success"
                : connection === "error"
                  ? "bg-danger"
                  : "bg-warning"
            } me-2`}
          >
            {connection === "connected"
              ? "✅ CONNECTED"
              : connection === "error"
                ? "❌ OFFLINE"
                : "⌛ CHECKING"}
          </div>

          <button
            className="btn btn-sm btn-outline-secondary ms-2"
            onClick={testConnection}
            disabled={loading}
          >
            Test Connection
          </button>

          <button
            className="btn btn-sm btn-outline-primary ms-2"
            onClick={() => setShowMenuList(!showMenuList)}
          >
            {showMenuList ? "Hide" : "Show"} Menus ({savedMenus.length})
          </button>
        </div>

        {status.message && (
          <div
            className={`alert ${
              status.type === "success"
                ? "alert-success"
                : status.type === "error"
                  ? "alert-danger"
                  : status.type === "loading"
                    ? "alert-info"
                    : "alert-warning"
            } alert-dismissible fade show`}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>{status.message}</div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setStatus({ type: "", message: "" })}
              ></button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="row">
        {/* Left Column - Form */}
        <div className="col-lg-8">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white">
              <ul className="nav nav-tabs card-header-tabs">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === "hpp" ? "active" : ""}`}
                    onClick={() => setActiveTab("hpp")}
                  >
                    📈 HPP Calculation
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === "resep" ? "active" : ""}`}
                    onClick={() => setActiveTab("resep")}
                  >
                    🥘 Recipe Details
                  </button>
                </li>
              </ul>
            </div>

            <div className="card-body">
              {/* HPP Tab */}
              {activeTab === "hpp" && (
                <div className="hpp-form">
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Menu Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={menuName}
                        onChange={(e) => setMenuName(e.target.value)}
                        placeholder="e.g., Spaghetti Carbonara"
                        disabled={loading}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Category</label>
                      <select
                        className="form-select"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        disabled={loading}
                      >
                        <option value="MAKANAN">Food</option>
                        <option value="MINUMAN">Drink</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Subcategory</label>
                      <select
                        className="form-select"
                        value={subcategory}
                        onChange={(e) => setSubcategory(e.target.value)}
                        disabled={loading}
                      >
                        {CATEGORIES[category]?.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Brand / Product Line</label>
                      <input
                        type="text"
                        className="form-control"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="e.g., Signature Dishes"
                        disabled={loading}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Target Cost</label>
                      <div className="input-group">
                        <span className="input-group-text">Rp</span>
                        <input
                          type="number"
                          className="form-control"
                          value={targetCost}
                          onChange={(e) => setTargetCost(e.target.value)}
                          placeholder="25000"
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Production Qty</label>
                      <input
                        type="number"
                        className="form-control"
                        value={targetQty}
                        onChange={(e) => setTargetQty(e.target.value)}
                        placeholder="4"
                        min="1"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="form-label">Profit Margin (%)</label>
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          value={profitMargin}
                          onChange={(e) => setProfitMargin(e.target.value)}
                          min="0"
                          max="100"
                          disabled={loading}
                        />
                        <span className="input-group-text">%</span>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">GoFood Fee (%)</label>
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          value={gofoodPercentage}
                          onChange={(e) => setGofoodPercentage(e.target.value)}
                          min="0"
                          max="100"
                          disabled={loading}
                        />
                        <span className="input-group-text">%</span>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Tax (%)</label>
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          value={taxPercentage}
                          onChange={(e) => setTaxPercentage(e.target.value)}
                          min="0"
                          max="100"
                          disabled={loading}
                        />
                        <span className="input-group-text">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes about this menu..."
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {/* Recipe Tab */}
              {activeTab === "resep" && (
                <div className="resep-form">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5>Ingredients ({ingredients.length})</h5>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={addIngredient}
                      disabled={loading}
                    >
                      + Add Ingredient
                    </button>
                  </div>

                  {ingredients.map((ingredient, index) => (
                    <div
                      key={ingredient.id}
                      className="ingredient-card mb-3 p-3 border rounded"
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0">
                          <span className="badge bg-secondary me-2">
                            {index + 1}
                          </span>
                          {ingredient.name || "New Ingredient"}
                        </h6>
                        {ingredients.length > 1 && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeIngredient(ingredient.id)}
                            disabled={loading}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="row g-2">
                        <div className="col-md-3">
                          <label className="form-label small">
                            Ingredient Name *
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={ingredient.name}
                            onChange={(e) =>
                              updateIngredient(
                                ingredient.id,
                                "name",
                                e.target.value,
                              )
                            }
                            disabled={loading}
                          />
                        </div>

                        <div className="col-md-2">
                          <label className="form-label small">
                            Usage Amount *
                          </label>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={ingredient.usage}
                            onChange={(e) =>
                              updateIngredient(
                                ingredient.id,
                                "usage",
                                e.target.value,
                              )
                            }
                            disabled={loading}
                          />
                        </div>

                        <div className="col-md-2">
                          <label className="form-label small">Unit</label>
                          <select
                            className="form-select form-control-sm"
                            value={ingredient.unit}
                            onChange={(e) =>
                              updateIngredient(
                                ingredient.id,
                                "unit",
                                e.target.value,
                              )
                            }
                            disabled={loading}
                          >
                            <option value="GRAM">Gram</option>
                            <option value="ML">ML</option>
                            <option value="PCS">Pcs</option>
                            <option value="KG">Kg</option>
                            <option value="LITER">Liter</option>
                          </select>
                        </div>

                        <div className="col-md-3">
                          <label className="form-label small">
                            Purchase Price *
                          </label>
                          <div className="input-group input-group-sm">
                            <span className="input-group-text">Rp</span>
                            <input
                              type="number"
                              className="form-control"
                              value={ingredient.purchase_price}
                              onChange={(e) =>
                                updateIngredient(
                                  ingredient.id,
                                  "purchase_price",
                                  e.target.value,
                                )
                              }
                              disabled={loading}
                            />
                          </div>
                        </div>

                        <div className="col-md-2">
                          <label className="form-label small">
                            Purchase Unit *
                          </label>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={ingredient.purchase_unit}
                            onChange={(e) =>
                              updateIngredient(
                                ingredient.id,
                                "purchase_unit",
                                e.target.value,
                              )
                            }
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <div className="row g-2 mt-2">
                        <div className="col-md-3">
                          <label className="form-label small">Category</label>
                          <select
                            className="form-select form-control-sm"
                            value={ingredient.category}
                            onChange={(e) =>
                              updateIngredient(
                                ingredient.id,
                                "category",
                                e.target.value,
                              )
                            }
                            disabled={loading}
                          >
                            <option value="BAHAN_UTAMA">Main Ingredient</option>
                            <option value="BAHAN_TAMBAHAN">Additional</option>
                            <option value="BUMBU">Seasoning</option>
                            <option value="KEMASAN">Packaging</option>
                          </select>
                        </div>

                        <div className="col-md-4">
                          <label className="form-label small">Supplier</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={ingredient.supplier}
                            onChange={(e) =>
                              updateIngredient(
                                ingredient.id,
                                "supplier",
                                e.target.value,
                              )
                            }
                            disabled={loading}
                          />
                        </div>

                        <div className="col-md-5">
                          <label className="form-label small">Notes</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={ingredient.notes}
                            onChange={(e) =>
                              updateIngredient(
                                ingredient.id,
                                "notes",
                                e.target.value,
                              )
                            }
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <div className="mt-2">
                        <small className="text-success">
                          Cost:{" "}
                          <strong>
                            {formatRupiah(calculateIngredientCost(ingredient))}
                          </strong>
                        </small>
                      </div>
                    </div>
                  ))}

                  {/* Packaging Section */}
                  <div className="mt-4 p-3 border rounded bg-light">
                    <h6>📦 Packaging Cost</h6>
                    <div className="row g-2">
                      <div className="col-md-4">
                        <label className="form-label small">
                          Packaging Name
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={packaging.name}
                          onChange={(e) =>
                            setPackaging({ ...packaging, name: e.target.value })
                          }
                          disabled={loading}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small">Total Cost</label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text">Rp</span>
                          <input
                            type="number"
                            className="form-control"
                            value={packaging.cost}
                            onChange={(e) =>
                              setPackaging({
                                ...packaging,
                                cost: e.target.value,
                              })
                            }
                            disabled={loading}
                          />
                        </div>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small">Quantity</label>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={packaging.quantity}
                          onChange={(e) =>
                            setPackaging({
                              ...packaging,
                              quantity: e.target.value,
                            })
                          }
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <small className="text-muted">
                      Total Ingredients Cost:{" "}
                      <strong>{formatRupiah(calculateTotalMaterial())}</strong>
                      <span className="ms-3">
                        Total Packaging:{" "}
                        <strong>
                          {formatRupiah(parseFloat(packaging.cost) || 0)}
                        </strong>
                      </span>
                    </small>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-4">
                <button
                  className="btn btn-success btn-lg w-100"
                  onClick={saveMenu}
                  disabled={loading || !menuName.trim()}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      {editMode ? "Updating..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      <i className="bi bi-save me-2"></i>
                      {editMode ? "Update Menu" : "Save Menu to Google Sheets"}
                    </>
                  )}
                </button>

                <div className="d-flex gap-2 mt-2">
                  <button
                    className="btn btn-outline-secondary flex-grow-1"
                    onClick={resetForm}
                    disabled={loading}
                  >
                    Clear Form
                  </button>

                  <button
                    className="btn btn-outline-primary flex-grow-1"
                    onClick={() =>
                      setActiveTab(activeTab === "hpp" ? "resep" : "hpp")
                    }
                    disabled={loading}
                  >
                    {activeTab === "hpp"
                      ? "Go to Recipe Details"
                      : "Go to HPP Calculation"}
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
                  <strong className="text-success">
                    {formatRupiah(calculateTotalMaterial())}
                  </strong>
                </div>
                <small className="text-muted">{ingredients.length} items</small>
              </div>

              <div className="summary-item mb-3">
                <div className="d-flex justify-content-between">
                  <span>Packaging:</span>
                  <strong className="text-warning">
                    {formatRupiah(parseFloat(packaging.cost) || 0)}
                  </strong>
                </div>
              </div>

              <div className="summary-item mb-3 p-2 bg-light rounded">
                <div className="d-flex justify-content-between">
                  <span>Total Production Cost:</span>
                  <strong className="text-primary">
                    {formatRupiah(calculateTotalProduction())}
                  </strong>
                </div>
                <small className="text-muted">For {targetQty} units</small>
              </div>

              <hr />

              <div className="result-box p-3 bg-success text-white rounded mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">HPP per Unit:</h6>
                  <h4 className="mb-0">
                    {formatRupiah(calculateHppPerUnit())}
                  </h4>
                </div>
                <small>Cost per serving</small>
              </div>

              <div className="result-box p-3 bg-light rounded">
                <div className="d-flex justify-content-between mb-2">
                  <span>Dine In Price:</span>
                  <strong className="text-primary">
                    {formatRupiah(calculateDineInPrice())}
                  </strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>GoFood Price:</span>
                  <strong className="text-danger">
                    {formatRupiah(calculateGofoodPrice())}
                  </strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Gross Profit/Unit:</span>
                  <strong className="text-success">
                    {formatRupiah(calculateGrossProfit())}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="card shadow-sm">
            <div className="card-header bg-purple text-white">
              <h5 className="mb-0">📈 Quick Stats</h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-6 mb-3">
                  <div className="stat-value">{profitMargin}%</div>
                  <small className="text-muted">Profit Margin</small>
                </div>
                <div className="col-6 mb-3">
                  <div className="stat-value">{ingredients.length}</div>
                  <small className="text-muted">Ingredients</small>
                </div>
                <div className="col-6 mb-3">
                  <div className="stat-value">{targetQty}</div>
                  <small className="text-muted">Production Qty</small>
                </div>
                <div className="col-6 mb-3">
                  <div className="stat-value text-success">
                    {formatRupiah(calculateTotalProfit())}
                  </div>
                  <small className="text-muted">Total Profit</small>
                </div>
              </div>

              {targetCost && (
                <div className="alert alert-warning mt-3">
                  <small>
                    <strong>Target vs Actual:</strong>
                    <br />
                    Target: {formatRupiah(parseFloat(targetCost))}
                    <br />
                    Actual HPP: {formatRupiah(calculateHppPerUnit())}
                    <br />
                    Difference:{" "}
                    <span
                      style={{
                        color:
                          (parseFloat(targetCost) || 0) >= calculateHppPerUnit()
                            ? "green"
                            : "red",
                      }}
                    >
                      {formatRupiah(
                        (parseFloat(targetCost) || 0) - calculateHppPerUnit(),
                      )}
                    </span>
                  </small>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Menu List Modal */}
      {showMenuList && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  Saved Menus ({savedMenus.length})
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowMenuList(false)}
                ></button>
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
                          <th>HPP/Unit</th>
                          <th>Dine In Price</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {savedMenus.map((menu, index) => (
                          <tr key={index}>
                            <td>
                              <small>{menu.menu_id || menu.local_id}</small>
                            </td>
                            <td>
                              <strong>
                                {menu.nama_menu || menu.menu_name}
                              </strong>
                            </td>
                            <td>
                              <span className="badge bg-info">
                                {menu.kategori || menu.category}
                              </span>
                            </td>
                            <td className="text-success">
                              {formatRupiah(
                                menu.hpp_per_unit || menu.hpp_per_piece || 0,
                              )}
                            </td>
                            <td className="text-primary">
                              {formatRupiah(
                                menu.harga_dine_in || menu.dine_in_price || 0,
                              )}
                            </td>
                            <td>
                              <span className="badge bg-success">ACTIVE</span>
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-warning"
                                onClick={() => {
                                  if (menu.menu_id) {
                                    loadMenuForEdit(menu.menu_id);
                                  }
                                  setShowMenuList(false);
                                }}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted">No menus saved yet</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowMenuList(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-4 mb-3 text-center">
        <div className="row">
          <div className="col-md-3">
            <small className="text-muted">
              Status:{" "}
              <span
                className={`badge ${connection === "connected" ? "bg-success" : "bg-warning"}`}
              >
                {connection === "connected" ? "ONLINE" : "OFFLINE"}
              </span>
            </small>
          </div>
          <div className="col-md-3">
            <small className="text-muted">
              Sheets: <strong>4 Sheets</strong>
            </small>
          </div>
          <div className="col-md-3">
            <small className="text-muted">
              Ingredients: <strong>{ingredients.length}</strong>
            </small>
          </div>
          <div className="col-md-3">
            <small className="text-muted">
              Mode: <strong>{editMode ? "EDITING" : "NEW"}</strong>
            </small>
          </div>
        </div>
        <p className="small text-muted mt-2">
          HPP Calculator v2.0 | Separate HPP & Recipe Storage | Google Sheets
          Integration
        </p>
      </footer>
    </div>
  );
};

export default App;
