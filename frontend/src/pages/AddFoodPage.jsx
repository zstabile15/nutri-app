import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ScanLine, Plus, ChevronRight, X, Star } from 'lucide-react';
import { api } from '../api';
import Modal from '../components/Modal';
import BarcodeScanner from '../components/BarcodeScanner';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

function guessMealType() {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 20) return 'dinner';
  return 'snack';
}

export default function AddFoodPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [servings, setServings] = useState(1);
  const [mealType, setMealType] = useState(guessMealType);
  const [logging, setLogging] = useState(false);
  const [recentFoods, setRecentFoods] = useState([]);
  const [showRecent, setShowRecent] = useState(false);
  const debounceRef = useRef(null);

  // Custom food fields
  const [custom, setCustom] = useState({
    name: '', brand: '', calories: '', protein: '', carbs: '', fat: '',
    fiber: '', serving_size: '100', serving_unit: 'g',
  });

  const doSearch = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await api.searchFoods(q);
      setResults(r);
    } catch (err) {
      console.error(err);
    }
    setSearching(false);
  }, []);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  const handleBarcodeScan = useCallback(async (code) => {
    setShowScanner(false);
    setSearching(true);
    try {
      const food = await api.lookupBarcode(code);
      setSelectedFood(food);
    } catch {
      setQuery(code);
      doSearch(code);
    }
    setSearching(false);
  }, [doSearch]);

  const logFood = async (food, servingsVal) => {
    setLogging(true);
    try {
      await api.logMeal({
        food_item_id: food.id,
        food_name: food.name,
        meal_type: mealType,
        servings: servingsVal,
        calories: food.calories * servingsVal,
        protein: food.protein * servingsVal,
        carbs: food.carbs * servingsVal,
        fat: food.fat * servingsVal,
        fiber: (food.fiber || 0) * servingsVal,
        sugar: (food.sugar || 0) * servingsVal,
      });
      navigate('/');
    } catch (err) {
      console.error(err);
    }
    setLogging(false);
  };

  const handleCustomSubmit = async () => {
    setLogging(true);
    try {
      const food = await api.createCustomFood({
        name: custom.name,
        brand: custom.brand || undefined,
        calories: parseFloat(custom.calories) || 0,
        protein: parseFloat(custom.protein) || 0,
        carbs: parseFloat(custom.carbs) || 0,
        fat: parseFloat(custom.fat) || 0,
        fiber: parseFloat(custom.fiber) || 0,
        serving_size: parseFloat(custom.serving_size) || 100,
        serving_unit: custom.serving_unit,
      });
      setSelectedFood(food);
      setShowCustom(false);
    } catch (err) {
      console.error(err);
    }
    setLogging(false);
  };

  const loadRecent = async () => {
    try {
      const r = await api.recentFoods();
      setRecentFoods(r);
      setShowRecent(true);
    } catch (err) { console.error(err); }
  };

  return (
    <div>
      <h1 className="page-title">Add Food</h1>

      {/* Meal type selector */}
      <div className="tabs">
        {MEAL_TYPES.map(t => (
          <button
            key={t}
            className={`tab ${mealType === t ? 'active' : ''}`}
            onClick={() => setMealType(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Search bar */}
      {!showScanner && !selectedFood && (
        <>
          <div className="search-container">
            <div className="search-input-wrap">
              <Search size={18} color="var(--text-tertiary)" />
              <input
                placeholder="Search foods..."
                value={query}
                onChange={handleQueryChange}
                autoFocus
              />
              {query && (
                <button className="btn btn-icon btn-ghost" onClick={() => { setQuery(''); setResults([]); }}>
                  <X size={16} />
                </button>
              )}
              <button className="btn btn-icon btn-ghost" onClick={() => setShowScanner(true)}>
                <ScanLine size={20} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowCustom(true)}>
              <Plus size={16} /> Custom Food
            </button>
            <button className="btn btn-secondary btn-sm" onClick={loadRecent}>
              <Star size={16} /> Recent
            </button>
          </div>

          {searching && (
            <div className="flex-center" style={{ padding: '24px 0' }}>
              <span className="spinner" />
            </div>
          )}

          {showRecent && recentFoods.length > 0 && !query && (
            <div style={{ marginTop: 'var(--space-md)' }}>
              <p className="section-title">Recent Foods</p>
              <div className="search-results">
                {recentFoods.map(food => (
                  <div key={food.id} className="food-result" onClick={() => setSelectedFood(food)}>
                    <div className="food-result-info">
                      <div className="food-result-name">{food.name}</div>
                      {food.brand && <div className="food-result-brand">{food.brand}</div>}
                    </div>
                    <span className="food-result-cals">{Math.round(food.calories)} kcal</span>
                    <ChevronRight size={16} color="var(--text-tertiary)" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="search-results" style={{ marginTop: 'var(--space-md)' }}>
              {results.map((food, i) => (
                <div key={`${food.source}-${food.source_id || food.id}-${i}`} className="food-result" onClick={() => setSelectedFood(food)}>
                  <div className="food-result-info">
                    <div className="food-result-name">{food.name}</div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {food.brand && <span className="food-result-brand">{food.brand}</span>}
                      <span className="food-source-badge">{food.source || 'local'}</span>
                    </div>
                  </div>
                  <span className="food-result-cals">{Math.round(food.calories)} kcal</span>
                  <ChevronRight size={16} color="var(--text-tertiary)" />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Barcode scanner */}
      {showScanner && (
        <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
      )}

      {/* Food detail / log confirmation */}
      {selectedFood && (
        <Modal title="Log Food" onClose={() => { setSelectedFood(null); setServings(1); }}>
          <div className="flex-col gap-md">
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedFood.name}</h3>
              {selectedFood.brand && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedFood.brand}</p>
              )}
            </div>

            <div className="card" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
              <div className="grid-4" style={{ textAlign: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-text)' }}>{Math.round(selectedFood.calories * servings)}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>kcal</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--protein-color)' }}>{Math.round(selectedFood.protein * servings)}g</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Protein</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--carbs-color)' }}>{Math.round(selectedFood.carbs * servings)}g</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Carbs</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--fat-color)' }}>{Math.round(selectedFood.fat * servings)}g</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Fat</div>
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label>Servings</label>
                <input
                  className="input"
                  type="number"
                  step="0.25"
                  min="0.25"
                  value={servings}
                  onChange={e => setServings(parseFloat(e.target.value) || 1)}
                />
              </div>
              <div className="input-group">
                <label>Serving size</label>
                <input className="input" disabled value={`${selectedFood.serving_size} ${selectedFood.serving_unit}`} />
              </div>
            </div>

            <div className="input-group">
              <label>Meal</label>
              <select className="select" value={mealType} onChange={e => setMealType(e.target.value)}>
                {MEAL_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-primary btn-lg btn-full"
              onClick={() => logFood(selectedFood, servings)}
              disabled={logging}
            >
              {logging ? <span className="spinner" /> : <><Plus size={18} /> Log Food</>}
            </button>
          </div>
        </Modal>
      )}

      {/* Custom food modal */}
      {showCustom && (
        <Modal title="Create Custom Food" onClose={() => setShowCustom(false)}>
          <div className="flex-col gap-md">
            <div className="input-group">
              <label>Name *</label>
              <input className="input" value={custom.name} onChange={e => setCustom(c => ({ ...c, name: e.target.value }))} placeholder="e.g. Homemade Granola" />
            </div>
            <div className="input-group">
              <label>Brand</label>
              <input className="input" value={custom.brand} onChange={e => setCustom(c => ({ ...c, brand: e.target.value }))} />
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>Calories</label>
                <input className="input" type="number" value={custom.calories} onChange={e => setCustom(c => ({ ...c, calories: e.target.value }))} />
              </div>
              <div className="input-group">
                <label>Protein (g)</label>
                <input className="input" type="number" value={custom.protein} onChange={e => setCustom(c => ({ ...c, protein: e.target.value }))} />
              </div>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>Carbs (g)</label>
                <input className="input" type="number" value={custom.carbs} onChange={e => setCustom(c => ({ ...c, carbs: e.target.value }))} />
              </div>
              <div className="input-group">
                <label>Fat (g)</label>
                <input className="input" type="number" value={custom.fat} onChange={e => setCustom(c => ({ ...c, fat: e.target.value }))} />
              </div>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>Serving size</label>
                <input className="input" type="number" value={custom.serving_size} onChange={e => setCustom(c => ({ ...c, serving_size: e.target.value }))} />
              </div>
              <div className="input-group">
                <label>Unit</label>
                <select className="select" value={custom.serving_unit} onChange={e => setCustom(c => ({ ...c, serving_unit: e.target.value }))}>
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="oz">oz</option>
                  <option value="cup">cup</option>
                  <option value="piece">piece</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary btn-full" onClick={handleCustomSubmit} disabled={!custom.name || logging}>
              {logging ? <span className="spinner" /> : 'Create & Select'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
