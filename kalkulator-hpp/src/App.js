import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const App = () => {
  // State untuk data produk
  const [productName, setProductName] = useState('');
  const [unitPrice, setUnitPrice] = useState(0);
  const [quantity, setQuantity] = useState(1);
  
  // State untuk daftar bahan baku
  const [materials, setMaterials] = useState([
    { id: 1, name: 'Bahan 1', unit: 'kg', price: 0, quantity: 0 }
  ]);
  
  // State untuk biaya tambahan
  const [additionalCosts, setAdditionalCosts] = useState([
    { id: 1, name: 'Biaya Tenaga Kerja', cost: 0 }
  ]);

  // Fungsi untuk menambah bahan baku
  const addMaterial = () => {
    const newId = materials.length > 0 ? Math.max(...materials.map(m => m.id)) + 1 : 1;
    setMaterials([...materials, { 
      id: newId, 
      name: `Bahan ${newId}`, 
      unit: 'kg', 
      price: 0, 
      quantity: 0 
    }]);
  };

  // Fungsi untuk menghapus bahan baku
  const removeMaterial = (id) => {
    if (materials.length > 1) {
      setMaterials(materials.filter(material => material.id !== id));
    }
  };

  // Fungsi untuk mengubah data bahan baku
  const updateMaterial = (id, field, value) => {
    setMaterials(materials.map(material => 
      material.id === id ? { ...material, [field]: value } : material
    ));
  };

  // Fungsi untuk menambah biaya tambahan
  const addAdditionalCost = () => {
    const newId = additionalCosts.length > 0 ? Math.max(...additionalCosts.map(c => c.id)) + 1 : 1;
    setAdditionalCosts([...additionalCosts, { 
      id: newId, 
      name: `Biaya ${newId}`, 
      cost: 0 
    }]);
  };

  // Fungsi untuk menghapus biaya tambahan
  const removeAdditionalCost = (id) => {
    if (additionalCosts.length > 1) {
      setAdditionalCosts(additionalCosts.filter(cost => cost.id !== id));
    }
  };

  // Fungsi untuk mengubah biaya tambahan
  const updateAdditionalCost = (id, field, value) => {
    setAdditionalCosts(additionalCosts.map(cost => 
      cost.id === id ? { ...cost, [field]: value } : cost
    ));
  };

  // Menghitung total biaya bahan baku
  const calculateTotalMaterialCost = () => {
    return materials.reduce((total, material) => {
      return total + (material.price * material.quantity);
    }, 0);
  };

  // Menghitung total biaya tambahan
  const calculateTotalAdditionalCost = () => {
    return additionalCosts.reduce((total, cost) => total + parseFloat(cost.cost || 0), 0);
  };

  // Menghitung total biaya produksi
  const calculateTotalProductionCost = () => {
    return calculateTotalMaterialCost() + calculateTotalAdditionalCost();
  };

  // Menghitung HPP per unit
  const calculateHPPPerUnit = () => {
    const totalCost = calculateTotalProductionCost();
    return quantity > 0 ? totalCost / quantity : 0;
  };

  // Menghitung profit per unit
  const calculateProfitPerUnit = () => {
    const hppPerUnit = calculateHPPPerUnit();
    return unitPrice - hppPerUnit;
  };

  // Menghitung margin profit
  const calculateProfitMargin = () => {
    const hppPerUnit = calculateHPPPerUnit();
    if (unitPrice > 0 && hppPerUnit > 0) {
      return ((unitPrice - hppPerUnit) / unitPrice) * 100;
    }
    return 0;
  };

  // Reset semua data
  const resetData = () => {
    setProductName('');
    setUnitPrice(0);
    setQuantity(1);
    setMaterials([{ id: 1, name: 'Bahan 1', unit: 'kg', price: 0, quantity: 0 }]);
    setAdditionalCosts([{ id: 1, name: 'Biaya Tenaga Kerja', cost: 0 }]);
  };

  return (
    <div className="container mt-5">
      <div className="row">
        <div className="col-md-12">
          <h1 className="text-center mb-4">Kalkulator HPP Produk</h1>
          <p className="text-center text-muted mb-5">
            Hitung Harga Pokok Produksi (HPP) produk Anda dengan memasukkan bahan baku dan biaya produksi
          </p>
        </div>
      </div>

      <div className="row">
        {/* Form Input Data Produk */}
        <div className="col-md-4">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Data Produk</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label htmlFor="productName" className="form-label">Nama Produk</label>
                <input
                  type="text"
                  className="form-control"
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Masukkan nama produk"
                />
              </div>
              <div className="mb-3">
                <label htmlFor="quantity" className="form-label">Jumlah Produksi (unit)</label>
                <input
                  type="number"
                  className="form-control"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  min="1"
                />
              </div>
              <div className="mb-3">
                <label htmlFor="unitPrice" className="form-label">Harga Jual per Unit (Rp)</label>
                <input
                  type="number"
                  className="form-control"
                  id="unitPrice"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  min="0"
                />
              </div>
              <button className="btn btn-secondary w-100" onClick={resetData}>
                Reset Semua Data
              </button>
            </div>
          </div>

          {/* Ringkasan Hasil Perhitungan */}
          <div className="card shadow-sm">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">Ringkasan HPP</h5>
            </div>
            <div className="card-body">
              <div className="row mb-2">
                <div className="col-8">Total Biaya Bahan Baku:</div>
                <div className="col-4 text-end fw-bold">
                  Rp {calculateTotalMaterialCost().toLocaleString('id-ID')}
                </div>
              </div>
              <div className="row mb-2">
                <div className="col-8">Total Biaya Tambahan:</div>
                <div className="col-4 text-end fw-bold">
                  Rp {calculateTotalAdditionalCost().toLocaleString('id-ID')}
                </div>
              </div>
              <div className="row mb-2">
                <div className="col-8">Total Biaya Produksi:</div>
                <div className="col-4 text-end fw-bold text-primary">
                  Rp {calculateTotalProductionCost().toLocaleString('id-ID')}
                </div>
              </div>
              <hr />
              <div className="row mb-2">
                <div className="col-8">HPP per Unit:</div>
                <div className="col-4 text-end fw-bold text-success">
                  Rp {calculateHPPPerUnit().toLocaleString('id-ID')}
                </div>
              </div>
              <div className="row mb-2">
                <div className="col-8">Harga Jual per Unit:</div>
                <div className="col-4 text-end fw-bold">
                  Rp {unitPrice.toLocaleString('id-ID')}
                </div>
              </div>
              <div className="row mb-2">
                <div className="col-8">Profit per Unit:</div>
                <div className="col-4 text-end fw-bold" style={{ 
                  color: calculateProfitPerUnit() >= 0 ? 'green' : 'red' 
                }}>
                  Rp {calculateProfitPerUnit().toLocaleString('id-ID')}
                </div>
              </div>
              <div className="row">
                <div className="col-8">Margin Profit:</div>
                <div className="col-4 text-end fw-bold" style={{ 
                  color: calculateProfitMargin() >= 0 ? 'green' : 'red' 
                }}>
                  {calculateProfitMargin().toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Bahan Baku */}
        <div className="col-md-4">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-warning">
              <h5 className="mb-0">Bahan Baku</h5>
            </div>
            <div className="card-body">
              {materials.map((material, index) => (
                <div key={material.id} className="border p-3 mb-3 rounded">
                  <div className="d-flex justify-content-between mb-2">
                    <h6>Bahan {index + 1}</h6>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => removeMaterial(material.id)}
                      disabled={materials.length === 1}
                    >
                      Hapus
                    </button>
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Nama Bahan</label>
                    <input
                      type="text"
                      className="form-control"
                      value={material.name}
                      onChange={(e) => updateMaterial(material.id, 'name', e.target.value)}
                    />
                  </div>
                  <div className="row mb-2">
                    <div className="col-6">
                      <label className="form-label">Satuan</label>
                      <select
                        className="form-control"
                        value={material.unit}
                        onChange={(e) => updateMaterial(material.id, 'unit', e.target.value)}
                      >
                        <option value="kg">kg</option>
                        <option value="gram">gram</option>
                        <option value="liter">liter</option>
                        <option value="ml">ml</option>
                        <option value="buah">buah</option>
                        <option value="pack">pack</option>
                        <option value="unit">unit</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label">Jumlah</label>
                      <input
                        type="number"
                        className="form-control"
                        value={material.quantity}
                        onChange={(e) => updateMaterial(material.id, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Harga per Satuan (Rp)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={material.price}
                      onChange={(e) => updateMaterial(material.id, 'price', parseFloat(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                  <div className="text-end">
                    <small className="text-muted">
                      Subtotal: Rp {(material.price * material.quantity).toLocaleString('id-ID')}
                    </small>
                  </div>
                </div>
              ))}
              
              <button className="btn btn-outline-warning w-100" onClick={addMaterial}>
                + Tambah Bahan Baku
              </button>
            </div>
          </div>
        </div>

        {/* Form Biaya Tambahan */}
        <div className="col-md-4">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">Biaya Tambahan</h5>
            </div>
            <div className="card-body">
              {additionalCosts.map((cost, index) => (
                <div key={cost.id} className="border p-3 mb-3 rounded">
                  <div className="d-flex justify-content-between mb-2">
                    <h6>Biaya {index + 1}</h6>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => removeAdditionalCost(cost.id)}
                      disabled={additionalCosts.length === 1}
                    >
                      Hapus
                    </button>
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Nama Biaya</label>
                    <input
                      type="text"
                      className="form-control"
                      value={cost.name}
                      onChange={(e) => updateAdditionalCost(cost.id, 'name', e.target.value)}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Jumlah Biaya (Rp)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={cost.cost}
                      onChange={(e) => updateAdditionalCost(cost.id, 'cost', parseFloat(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                </div>
              ))}
              
              <button className="btn btn-outline-info w-100" onClick={addAdditionalCost}>
                + Tambah Biaya
              </button>
            </div>
          </div>

          {/* Keterangan */}
          <div className="card shadow-sm">
            <div className="card-header bg-secondary text-white">
              <h5 className="mb-0">Keterangan</h5>
            </div>
            <div className="card-body">
              <p><strong>HPP (Harga Pokok Produksi)</strong> adalah total biaya yang dikeluarkan untuk menghasilkan suatu produk.</p>
              <p><strong>Rumus HPP per Unit:</strong></p>
              <p className="text-center">HPP = (Total Biaya Bahan Baku + Total Biaya Tambahan) / Jumlah Unit Diproduksi</p>
              <p><strong>Biaya Tambahan</strong> dapat mencakup:</p>
              <ul>
                <li>Biaya tenaga kerja</li>
                <li>Biaya overhead pabrik</li>
                <li>Biaya kemasan</li>
                <li>Biaya transportasi bahan</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-5 mb-3 text-center text-muted">
        <p>Program Kalkulator HPP Produk &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default App;