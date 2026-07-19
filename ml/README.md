# Recommendation ML pipeline (auto-inference)

## Flow

1. Backend loads `rotation_model.joblib` + `exhaustion_model.joblib` **once** at startup.
2. On field create / sync / update / crop change → if required features are present, inference runs and `recommendations` are stored on the field.
3. Frontend debounces subplot edits (400ms) → `POST /predict` → stores `subplot.data.recommendations`.
4. Recommend tab shows stored results; batch-fills any missing ones (vectorized).

## Required features

`soil_type`, `crop_history`, `next_crop`, `soil_ph`, `acres`

## Train

```powershell
.\.venv\Scripts\python.exe ml\train_models.py --data ml\data\synthetic_dataset.csv
```

Restart the backend after training.

## Example

```bash
curl -X POST http://127.0.0.1:8000/predict -H "Content-Type: application/json" -d "{\"soil_type\":\"loam\",\"crop_history\":[\"corn\",\"wheat\"],\"next_crop\":\"soybean\",\"acres\":12.5,\"soil_ph\":6.4}"
```

Complete → model output. Incomplete → `{ "ready": false, "missing_fields": [...] }`.
