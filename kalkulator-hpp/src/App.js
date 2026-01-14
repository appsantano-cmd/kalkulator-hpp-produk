import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const App = () => {
  // State untuk data kosong (tanpa default data)
  const [brand, setBrand] = useState('');
  const [targetCost, setTargetCost] = useState('');
  const [targetPieces, setTargetPieces] = useState('');
  
  // State untuk bahan baku kosong
  const [ingredients, setIngredients] = useState([
    { id: 1, name: '', usage: '', unit: 'gr', purchasePrice: '', purchaseUnit: '', purchaseUnitType: 'gram', targetCost: '' }
  ]);

  // State untuk consumable
  const [consumable, setConsumable] = useState({
    cost: '',
    quantity: '',
    unit: 'unit'
  });

  // State untuk persentase
  const [goFoodPercentage, setGoFoodPercentage] = useState(20);
  const [taxPercentage, setTaxPercentage] = useState(10);
  const [profitMargin, setProfitMargin] = useState(40);

  // Fungsi untuk menghitung biaya per bahan
  const calculateIngredientCost = (ingredient) => {
    const usage = parseFloat(ingredient.usage) || 0;
    const purchaseUnit = parseFloat(ingredient.purchaseUnit) || 1;
    const purchasePrice = parseFloat(ingredient.purchasePrice) || 0;
    
    if (purchaseUnit > 0 && purchasePrice > 0) {
      return (usage / purchaseUnit) * purchasePrice;
    }
    return 0;
  };

  // Fungsi untuk menghitung total biaya bahan baku
  const calculateTotalMaterialCost = () => {
    return ingredients.reduce((total, ingredient) => {
      return total + calculateIngredientCost(ingredient);
    }, 0);
  };

  // Fungsi untuk menghitung total biaya produksi
  const calculateTotalProductionCost = () => {
    const materialCost = calculateTotalMaterialCost();
    const consumableCost = parseFloat(consumable.cost) || 0;
    return materialCost + consumableCost;
  };

  // Fungsi untuk menghitung HPP per piece
  const calculateHPPPerPiece = () => {
    const totalCost = calculateTotalProductionCost();
    const pieces = parseFloat(targetPieces) || 1;
    return pieces > 0 ? totalCost / pieces : 0;
  };

  // Fungsi untuk menghitung harga jual dine in
  const calculateDineInPrice = () => {
    const hpp = calculateHPPPerPiece();
    const margin = profitMargin / 100;
    return hpp / (1 - margin);
  };

  // Fungsi untuk menghitung laba kotor
  const calculateGrossProfit = () => {
    const dineInPrice = calculateDineInPrice();
    const hpp = calculateHPPPerPiece();
    return dineInPrice - hpp;
  };

  // Fungsi untuk menghitung biaya Go Food
  const calculateGoFoodCost = () => {
    const dineInPrice = calculateDineInPrice();
    return dineInPrice * (goFoodPercentage / 100);
  };

  // Fungsi untuk menghitung pajak restoran
  const calculateRestaurantTax = () => {
    const dineInPrice = calculateDineInPrice();
    return dineInPrice * (taxPercentage / 100);
  };

  // Fungsi untuk menghitung harga jual Go Food
  const calculateGoFoodPrice = () => {
    const dineInPrice = calculateDineInPrice();
    const goFoodCost = calculateGoFoodCost();
    const tax = calculateRestaurantTax();
    return dineInPrice + goFoodCost + tax;
  };

  // Fungsi untuk mengupdate data bahan
  const updateIngredient = (id, field, value) => {
    setIngredients(ingredients.map(ingredient =>
      ingredient.id === id ? { ...ingredient, [field]: value } : ingredient
    ));
  };

  // Fungsi untuk menambah bahan baru
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
        purchaseUnitType: 'gram',
        targetCost: ''
      }
    ]);
  };

  // Fungsi untuk menghapus bahan
  const removeIngredient = (id) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ingredient => ingredient.id !== id));
    }
  };

  // Fungsi untuk reset semua data
  const resetAllData = () => {
    setBrand('');
    setTargetCost('');
    setTargetPieces('');
    setIngredients([{ id: 1, name: '', usage: '', unit: 'gr', purchasePrice: '', purchaseUnit: '', purchaseUnitType: 'gram', targetCost: '' }]);
    setConsumable({ cost: '', quantity: '', unit: 'unit' });
    setGoFoodPercentage(20);
    setTaxPercentage(10);
    setProfitMargin(40);
  };

  // Format angka ke Rupiah
  const formatRupiah = (number) => {
    if (isNaN(number) || number === 0) return 'Rp 0';
    return `Rp ${Math.round(number).toLocaleString('id-ID')}`;
  };

  return (
    <div className="container mt-3">
      {/* Header */}
      <div className="header-section text-center mb-4">
        <h1 className="text-primary">🛒 Kalkulator HPP Produk</h1>
        <p className="text-muted">Hitung Harga Pokok Produksi dengan mudah untuk bisnis makanan Anda</p>
      </div>

      {/* Info Box */}
      <div className="info-box mb-4 p-3 bg-light border rounded">
        <h5>📋 Cara Menggunakan:</h5>
        <ol className="mb-0">
          <li>Isi data produk dan target produksi</li>
          <li>Masukkan bahan-bahan yang digunakan</li>
          <li>Tambahkan biaya kemasan/packaging (jika ada)</li>
          <li>Lihat hasil perhitungan HPP dan harga jual</li>
        </ol>
      </div>

      <div className="row">
        {/* Form Utama - Sisi Kiri */}
        <div className="col-lg-7">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">📝 Data Produk</h5>
              <button className="btn btn-light btn-sm" onClick={resetAllData}>
                🔄 Reset Semua
              </button>
            </div>
            <div className="card-body">
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
                    placeholder="Contoh: Carrot Cake"
                  />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">
                    <i className="bi bi-bullseye me-2"></i>Target Biaya per Unit
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">Rp</span>
                    <input
                      type="number"
                      className="form-control"
                      value={targetCost}
                      onChange={(e) => setTargetCost(e.target.value)}
                      placeholder="Target"
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
                    />
                    <span className="input-group-text">pcs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bagian Bahan Baku */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">🥕 Bahan Baku</h5>
            </div>
            <div className="card-body">
              {ingredients.map((ingredient, index) => (
                <div key={ingredient.id} className="ingredient-card mb-3 p-3 border rounded">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">
                      <i className="bi bi-egg-fried me-2"></i>
                      Bahan {index + 1}
                    </h6>
                    {ingredients.length > 1 && (
                      <button 
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => removeIngredient(ingredient.id)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    )}
                  </div>
                  
                  <div className="row g-2">
                    <div className="col-md-4">
                      <label className="form-label small">Nama Bahan</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={ingredient.name}
                        onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)}
                        placeholder="Contoh: Tepung Terigu"
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small">Jumlah Pakai</label>
                      <div className="input-group input-group-sm">
                        <input
                          type="number"
                          className="form-control"
                          value={ingredient.usage}
                          onChange={(e) => updateIngredient(ingredient.id, 'usage', e.target.value)}
                          placeholder="360"
                        />
                        <select
                          className="form-select"
                          style={{ width: '80px' }}
                          value={ingredient.unit}
                          onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
                        >
                          <option value="gr">gr</option>
                          <option value="ml">ml</option>
                          <option value="kg">kg</option>
                          <option value="pcs">pcs</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small">Harga Beli</label>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text">Rp</span>
                        <input
                          type="number"
                          className="form-control"
                          value={ingredient.purchasePrice}
                          onChange={(e) => updateIngredient(ingredient.id, 'purchasePrice', e.target.value)}
                          placeholder="25000"
                        />
                      </div>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small">Satuan Beli</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={ingredient.purchaseUnit}
                        onChange={(e) => updateIngredient(ingredient.id, 'purchaseUnit', e.target.value)}
                        placeholder="1000"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <small className="text-success">
                      <i className="bi bi-calculator me-1"></i>
                      Biaya bahan ini: {formatRupiah(calculateIngredientCost(ingredient))}
                    </small>
                  </div>
                </div>
              ))}
              
              <button className="btn btn-outline-success w-100" onClick={addIngredient}>
                <i className="bi bi-plus-circle me-2"></i>
                Tambah Bahan Baku
              </button>
            </div>
          </div>

          {/* Bagian Biaya Tambahan */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-warning">
              <h5 className="mb-0">📦 Biaya Packaging & Lainnya</h5>
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
                      placeholder="Contoh: 5000"
                    />
                  </div>
                  <small className="text-muted">Untuk semua unit produksi</small>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    <i className="bi bi-cash-coin me-2"></i>Biaya Lainnya
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">%</span>
                    <input
                      type="number"
                      className="form-control"
                      value={profitMargin}
                      onChange={(e) => setProfitMargin(e.target.value)}
                      placeholder="Margin profit"
                    />
                    <span className="input-group-text">Margin</span>
                  </div>
                  <small className="text-muted">Persentase laba yang diinginkan</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel Hasil - Sisi Kanan */}
        <div className="col-lg-5">
          {/* Ringkasan Hasil */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">📊 Ringkasan Biaya</h5>
            </div>
            <div className="card-body">
              <div className="summary-item mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span>Total Biaya Bahan Baku:</span>
                  <span className="fw-bold">{formatRupiah(calculateTotalMaterialCost())}</span>
                </div>
                <div className="progress mb-2">
                  <div 
                    className="progress-bar bg-success" 
                    style={{ width: '70%' }}
                  ></div>
                </div>
              </div>

              <div className="summary-item mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span>Biaya Packaging:</span>
                  <span className="fw-bold">{formatRupiah(parseFloat(consumable.cost) || 0)}</span>
                </div>
                <div className="progress mb-2">
                  <div 
                    className="progress-bar bg-warning" 
                    style={{ width: '15%' }}
                  ></div>
                </div>
              </div>

              <div className="summary-item mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span>Total Biaya Produksi:</span>
                  <span className="fw-bold text-primary">{formatRupiah(calculateTotalProductionCost())}</span>
                </div>
                <div className="progress mb-2">
                  <div 
                    className="progress-bar bg-primary" 
                    style={{ width: '85%' }}
                  ></div>
                </div>
              </div>

              <hr />

              <div className="result-box p-3 bg-light rounded mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0">HPP per Unit:</h6>
                  <h5 className="mb-0 text-success">{formatRupiah(calculateHPPPerPiece())}</h5>
                </div>
                <small className="text-muted">
                  Harga Pokok Produksi untuk 1 unit produk
                </small>
              </div>

              {targetCost && (
                <div className="result-box p-3 bg-light rounded">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0">Target vs Aktual:</h6>
                    <h5 className="mb-0" style={{
                      color: (parseFloat(targetCost) || 0) - calculateHPPPerPiece() >= 0 ? 'green' : 'red'
                    }}>
                      {formatRupiah((parseFloat(targetCost) || 0) - calculateHPPPerPiece())}
                    </h5>
                  </div>
                  <small className="text-muted">
                    {((parseFloat(targetCost) || 0) - calculateHPPPerPiece()) >= 0 ? '✅ Dibawah target' : '⚠️ Di atas target'}
                  </small>
                </div>
              )}
            </div>
          </div>

          {/* Kalkulator Harga Jual */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-purple text-white">
              <h5 className="mb-0">💰 Kalkulator Harga Jual</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Persentase Biaya Platform (GoFood/GrabFood)</label>
                <div className="input-group mb-2">
                  <input
                    type="number"
                    className="form-control"
                    value={goFoodPercentage}
                    onChange={(e) => setGoFoodPercentage(e.target.value)}
                    placeholder="20"
                  />
                  <span className="input-group-text">%</span>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Persentase Pajak Restoran</label>
                <div className="input-group mb-2">
                  <input
                    type="number"
                    className="form-control"
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(e.target.value)}
                    placeholder="10"
                  />
                  <span className="input-group-text">%</span>
                </div>
              </div>

              <div className="price-results">
                <div className="price-item mb-2 p-2 bg-light rounded">
                  <div className="d-flex justify-content-between">
                    <span>Harga Dine In:</span>
                    <span className="fw-bold">{formatRupiah(calculateDineInPrice())}</span>
                  </div>
                </div>
                
                <div className="price-item mb-2 p-2 bg-light rounded">
                  <div className="d-flex justify-content-between">
                    <span>Biaya Platform:</span>
                    <span className="text-warning">{formatRupiah(calculateGoFoodCost())}</span>
                  </div>
                </div>
                
                <div className="price-item mb-2 p-2 bg-light rounded">
                  <div className="d-flex justify-content-between">
                    <span>Pajak Restoran:</span>
                    <span className="text-warning">{formatRupiah(calculateRestaurantTax())}</span>
                  </div>
                </div>
                
                <div className="price-item p-2 bg-success text-white rounded mt-3">
                  <div className="d-flex justify-content-between">
                    <span><strong>Harga GoFood:</strong></span>
                    <span><strong>{formatRupiah(calculateGoFoodPrice())}</strong></span>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <small className="text-muted">
                  <i className="bi bi-info-circle me-1"></i>
                  Laba kotor per unit: {formatRupiah(calculateGrossProfit())}
                </small>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="card shadow-sm">
            <div className="card-header bg-light">
              <h5 className="mb-0">💡 Tips & Saran</h5>
            </div>
            <div className="card-body">
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Pastikan semua bahan sudah terdaftar
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Hitung biaya kemasan dengan tepat
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Sesuaikan margin profit dengan target pasar
                </li>
                <li>
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Harga GoFood sudah termasuk semua biaya
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-4 mb-3 text-center text-muted">
        <p className="small">
          <i className="bi bi-calculator me-1"></i>
          Kalkulator HPP Produk © {new Date().getFullYear()} | 
          Mulai dengan mengisi data di form sebelah kiri
        </p>
      </footer>
    </div>
  );
};

export default App;