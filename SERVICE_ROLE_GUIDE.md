# استخدام Service Role Key للاستيراد

إذا استمرت مشكلة RLS، الحل الأفضل هو استخدام **Service Role Key** بدلاً من Anon Key.

## الخطوات:

### 1. احصل على Service Role Key من Supabase

1. افتح **Supabase Dashboard**
2. اذهب إلى **Settings** → **API**
3. انسخ **service_role key** (⚠️ احتفظ بها سرية!)

### 2. أنشئ ملف .env.migration

أنشئ ملف جديد في مجلد `frontend`:

**frontend/.env.migration**
```env
VITE_SUPABASE_URL=<نفس URL الموجود في .env>
VITE_SUPABASE_SERVICE_KEY=<service_role_key_من_الخطوة_1>
```

⚠️ **مهم**: لا تضف هذا الملف إلى git! أضفه إلى `.gitignore`

### 3. عدّل migrate-brands-only.ts

استبدل السطر 7 بهذا:

```typescript
// استخدم .env.migration بدلاً من .env
dotenv.config({ path: path.join(__dirname, '../frontend/.env.migration') });
```

واستبدل السطور 20-22 بهذا:

```typescript
// استخدم service role key للاستيراد
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY!; // بدلاً من ANON_KEY
```

### 4. شغّل الاستيراد

```bash
npm run migrate:brands
```

---

## ⚠️ تحذير أمني

**Service Role Key** يتجاوز **جميع** سياسات الأمان. استخدمه **فقط** للاستيراد ولا تشاركه أبداً.

بعد الانتهاء من الاستيراد:
1. احذف ملف `.env.migration`
2. أعد السكريبت لاستخدام `.env` العادي
