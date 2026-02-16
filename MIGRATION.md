# Data Migration Guide

## Quick Start

### 1. Test Migration (Dry Run)
Preview what will be imported without actually inserting data:

```bash
cd "c:\Users\y_tar\Desktop\البرنامج للتجربة\from scratch maint app"
npm run migrate:dry-run
```

### 2. Run Actual Migration
Import data into Supabase:

```bash
npm run migrate:yes
```

## Migration Process

The migration runs in **4 phases**:

### Phase 1: Master Data ✅
- **Brands** from `company brands.xlsx`
- **Sectors** from `branches and sectors.xlsx` (Sheet 1)

### Phase 2: Hierarchical Data ✅
- **Areas** from `branches and sectors.xlsx` (Sheet 2)
- **Branches** from `branches names and addresses.xlsx`

### Phase 3: Users ⚠️
- **Manual Step Required**: Create Auth users in Supabase Dashboard
- Then run profile import (script available separately)

### Phase 4: Tickets ⚠️
- Import tickets after profiles are set up

## Important Notes

> [!IMPORTANT]
> **Column Name Assumptions**
> 
> The scripts make assumptions about Excel column names. If your import fails, you may need to adjust the column names in the importer files:
> - `scripts/importers/brands.ts`
> - `scripts/importers/sectors-areas.ts`
> - `scripts/importers/branches.ts`

> [!WARNING]
> **Duplicate Handling**
> 
> The scripts use `upsert` with conflict resolution on unique fields. Existing records with the same name will be updated, not duplicated.

## Troubleshooting

### Error: "File not found"
- Make sure all Excel files are in the `data/` folder
- Check file names match exactly (including spaces)

### Error: "Missing Supabase credentials"
- Ensure `frontend/.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Error: "Sector not found" or "Area not found"
- This means a relationship couldn't be resolved
- Check that referenced data exists in previous phases
- Run dry-run mode to see which rows have issues

### Wrong Column Names
- Edit the importer files in `scripts/importers/`
- Look for the column name mapping (e.g., `row['اسم الماركة']`)
- Update to match your Excel file's actual column names

## Files Created

```
scripts/
├── migrate-data.ts              # Main script
├── utils/
│   ├── excel-reader.ts          # Excel parsing
│   └── data-cleaner.ts          # Data normalization
└── importers/
    ├── brands.ts                # Brands import
    ├── sectors-areas.ts         # Sectors & Areas import
    └── branches.ts              # Branches import
```

## Next Steps After Migration

1. **Verify Data**: Check Supabase dashboard to ensure data imported correctly
2. **Create Users**: Set up Auth users for team members
3. **Import Profiles**: Link profiles to Auth users
4. **Import Tickets**: Migrate historical maintenance records
5. **Test Application**: Verify data displays correctly in the app
