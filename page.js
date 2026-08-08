'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  ShoppingBag, Truck, ShieldCheck, Phone, MapPin, User, Minus, Plus, CheckCircle2,
  Loader2, Lock, Package, ClipboardList, LogOut, Copy, Download, Pencil, Trash2,
  ImagePlus, X, ArrowRight, Star, ShoppingCart, LayoutDashboard, TrendingUp
} from 'lucide-react'

const WILAYAS = [
  '01 - أدرار','02 - الشلف','03 - الأغواط','04 - أم البواقي','05 - باتنة','06 - بجاية','07 - بسكرة','08 - بشار',
  '09 - البليدة','10 - البويرة','11 - تمنراست','12 - تبسة','13 - تلمسان','14 - تيارت','15 - تيزي وزو','16 - الجزائر',
  '17 - الجلفة','18 - جيجل','19 - سطيف','20 - سعيدة','21 - سكيكدة','22 - سيدي بلعباس','23 - عنابة','24 - قالمة',
  '25 - قسنطينة','26 - المدية','27 - مستغانم','28 - المسيلة','29 - معسكر','30 - ورقلة','31 - وهران','32 - البيض',
  '33 - إليزي','34 - برج بوعريريج','35 - بومرداس','36 - الطارف','37 - تندوف','38 - تيسمسيلت','39 - الوادي','40 - خنشلة',
  '41 - سوق أهراس','42 - تيبازة','43 - ميلة','44 - عين الدفلى','45 - النعامة','46 - عين تموشنت','47 - غرداية','48 - غليزان',
  '49 - تيميمون','50 - برج باجي مختار','51 - أولاد جلال','52 - بني عباس','53 - عين صالح','54 - عين قزام','55 - تقرت',
  '56 - جانت','57 - المغير','58 - المنيعة'
]

const STATUS = {
  new: { label: 'جديد', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  confirmed: { label: 'مؤكد', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  shipped: { label: 'تم الشحن', cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  cancelled: { label: 'ملغى', cls: 'bg-red-100 text-red-700 border-red-200' },
}

const fmt = (n) => new Intl.NumberFormat('en-US').format(n || 0)

function compressImage(file, maxSize = 1000, quality = 0.72) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > height) { if (width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize } }
        else { if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize } }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function App() {
  const [view, setView] = useState('store')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [activeImg, setActiveImg] = useState(0)
  const [lastOrder, setLastOrder] = useState(null)
  const [delivery, setDelivery] = useState({ defaultFee: 0, fees: {} })

  const [qty, setQty] = useState(1)
  const [form, setForm] = useState({ fullName: '', phone: '', wilaya: '', commune: '', notes: '' })
  const [placing, setPlacing] = useState(false)

  const [adminToken, setAdminToken] = useState('')
  const [adminPass, setAdminPass] = useState('')
  const [adminTab, setAdminTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState(null)
  const [orderFilter, setOrderFilter] = useState('all')
  const [prodDialog, setProdDialog] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [pForm, setPForm] = useState({ name: '', description: '', price: '', oldPrice: '', badge: '', stock: '', images: [] })
  const [savingProduct, setSavingProduct] = useState(false)
  const [feeForm, setFeeForm] = useState({ defaultFee: '', fees: {} })
  const [savingFees, setSavingFees] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_BASE_URL || '')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch (e) { toast.error('تعذر تحميل المنتجات') }
    setLoading(false)
  }, [])

  const fetchDelivery = useCallback(async () => {
    try {
      const res = await fetch('/api/delivery-fees')
      const data = await res.json()
      if (data && typeof data === 'object') setDelivery({ defaultFee: data.defaultFee || 0, fees: data.fees || {} })
    } catch (e) {}
  }, [])

  const feeFor = (wilaya) => {
    if (!wilaya) return null
    if (delivery.fees && delivery.fees[wilaya] != null) return Number(delivery.fees[wilaya])
    return Number(delivery.defaultFee || 0)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pid = params.get('p')
    const isAdminUrl = params.get('admin') === '1'
    const saved = localStorage.getItem('dz_admin_token')
    if (saved) setAdminToken(saved)

    ;(async () => {
      setLoading(true)
      fetchDelivery()
      try {
        const res = await fetch('/api/products')
        const data = await res.json()
        const list = Array.isArray(data) ? data : []
        setProducts(list)
        if (pid) {
          const found = list.find(p => p.id === pid)
          if (found) { setSelected(found); setActiveImg(0); setView('product') }
        } else if (isAdminUrl) {
          setView('admin')
        }
      } catch (e) {}
      setLoading(false)
    })()
  }, [])

  const openProduct = (p) => {
    setSelected(p); setActiveImg(0); setQty(1); setView('product')
    window.history.pushState({}, '', `/?p=${p.id}`)
    window.scrollTo(0, 0)
  }
  const goStore = () => {
    setView('store')
    window.history.pushState({}, '', '/')
    window.scrollTo(0, 0)
    fetchProducts()
  }

  const placeOrder = async () => {
    if (!form.fullName.trim()) return toast.error('الرجاء إدخال الاسم الكامل')
    if (!form.phone.trim()) return toast.error('الرجاء إدخال رقم الهاتف')
    if (!form.wilaya) return toast.error('الرجاء اختيار الولاية')
    if (!form.commune.trim()) return toast.error('الرجاء إدخال البلدية')
    setPlacing(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selected.id, quantity: qty, ...form })
      })
      const data = await res.json()
      if (res.ok) {
        setLastOrder(data)
        setForm({ fullName: '', phone: '', wilaya: '', commune: '', notes: '' })
        setQty(1)
        setView('success')
        window.scrollTo(0, 0)
      } else { toast.error(data.error || 'حدث خطأ') }
    } catch (e) { toast.error('تعذر إرسال الطلب') }
    setPlacing(false)
  }

  const adminLogin = async () => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setAdminToken(data.token)
        localStorage.setItem('dz_admin_token', data.token)
        setAdminPass('')
        toast.success('مرحباً بك 👋')
      } else { toast.error(data.error || 'كلمة المرور غير صحيحة') }
    } catch (e) { toast.error('تعذر تسجيل الدخول') }
  }
  const adminLogout = () => {
    setAdminToken(''); localStorage.removeItem('dz_admin_token')
  }
  const authHeaders = () => ({ 'Content-Type': 'application/json', 'x-admin-token': adminToken })

  const loadAdminData = useCallback(async () => {
    if (!adminToken) return
    try {
      const [oRes, sRes] = await Promise.all([
        fetch('/api/orders', { headers: { 'x-admin-token': adminToken } }),
        fetch('/api/stats', { headers: { 'x-admin-token': adminToken } }),
      ])
      if (oRes.ok) setOrders(await oRes.json())
      if (sRes.ok) setStats(await sRes.json())
      fetchProducts()
    } catch (e) {}
  }, [adminToken, fetchProducts])

  useEffect(() => { if (view === 'admin' && adminToken) loadAdminData() }, [view, adminToken, loadAdminData])

  const updateOrderStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status }) })
      if (res.ok) { loadAdminData(); toast.success('تم تحديث حالة الطلب') }
    } catch (e) { toast.error('تعذر التحديث') }
  }

  const exportCSV = async () => {
    try {
      const res = await fetch('/api/orders/export', { headers: { 'x-admin-token': adminToken } })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'orders.csv'; a.click()
      URL.revokeObjectURL(url)
      toast.success('تم تصدير الطلبات')
    } catch (e) { toast.error('تعذر التصدير') }
  }

  const copyLink = (id) => {
    const link = `${baseUrl}/?p=${id}`
    navigator.clipboard.writeText(link)
    toast.success('تم نسخ رابط المنتج ✓')
  }

  const openProductDialog = (p) => {
    if (p) {
      setEditingId(p.id)
      setPForm({ name: p.name, description: p.description || '', price: String(p.price), oldPrice: p.oldPrice ? String(p.oldPrice) : '', badge: p.badge || '', stock: String(p.stock ?? ''), images: p.images || [] })
    } else {
      setEditingId(null)
      setPForm({ name: '', description: '', price: '', oldPrice: '', badge: '', stock: '', images: [] })
    }
    setProdDialog(true)
  }

  const handleImageUpload = async (files) => {
    const arr = Array.from(files)
    const compressed = []
    for (const f of arr) { compressed.push(await compressImage(f)) }
    setPForm(prev => ({ ...prev, images: [...prev.images, ...compressed] }))
  }

  const saveProduct = async () => {
    if (!pForm.name.trim() || !pForm.price) return toast.error('الاسم والسعر مطلوبان')
    setSavingProduct(true)
    try {
      const payload = { ...pForm, price: Number(pForm.price), oldPrice: pForm.oldPrice ? Number(pForm.oldPrice) : null, stock: pForm.stock ? Number(pForm.stock) : 0 }
      const url = editingId ? `/api/products/${editingId}` : '/api/products'
      const res = await fetch(url, { method: editingId ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(payload) })
      if (res.ok) { toast.success(editingId ? 'تم تحديث المنتج' : 'تمت إضافة المنتج'); setProdDialog(false); loadAdminData() }
      else { toast.error('تعذر الحفظ') }
    } catch (e) { toast.error('تعذر الحفظ') }
    setSavingProduct(false)
  }

  const deleteProduct = async (id) => {
    if (!confirm('هل تريد حذف هذا المنتج؟')) return
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE', headers: { 'x-admin-token': adminToken } })
      if (res.ok) { toast.success('تم حذف المنتج'); loadAdminData() }
    } catch (e) { toast.error('تعذر الحذف') }
  }

  const discountPct = (p) => p?.oldPrice && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0

  /* =================== STORE =================== */
  const renderStore = () => (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <button onClick={goStore} className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 grid place-items-center text-white">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div className="text-right leading-tight">
              <div className="font-extrabold text-lg text-neutral-900">DZ Store</div>
              <div className="text-[11px] text-neutral-500">الدفع عند الاستلام</div>
            </div>
          </button>
          <Button variant="ghost" size="sm" onClick={() => setView('admin')} className="text-neutral-500">
            <Lock className="h-4 w-4 ml-1" /> الإدارة
          </Button>
        </div>
      </header>

      <section className="bg-gradient-to-l from-emerald-600 to-emerald-500 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center">
          <Badge className="bg-white/20 text-white border-0 mb-3">🚚 توصيل إلى 58 ولاية</Badge>
          <h1 className="text-2xl sm:text-4xl font-extrabold mb-2">تسوّق بسهولة، وادفع عند الاستلام</h1>
          <p className="text-emerald-50 text-sm sm:text-base max-w-xl mx-auto">منتجات مختارة بعناية بأسعار مناسبة. اطلب الآن واستلم طلبك أمام بابك.</p>
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm">
            <span className="flex items-center gap-1"><Truck className="h-4 w-4" /> توصيل سريع</span>
            <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> دفع آمن عند الاستلام</span>
            <span className="flex items-center gap-1"><Star className="h-4 w-4" /> جودة مضمونة</span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-xl font-bold mb-4 text-neutral-900">منتجاتنا</h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (<div key={i} className="rounded-2xl bg-white border h-72 animate-pulse" />))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-neutral-500">لا توجد منتجات بعد.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(p => (
              <Card key={p.id} onClick={() => openProduct(p)} className="overflow-hidden cursor-pointer group border-neutral-200 hover:shadow-lg transition-shadow rounded-2xl">
                <div className="relative aspect-square bg-neutral-100 overflow-hidden">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-neutral-300"><Package className="h-10 w-10" /></div>
                  )}
                  {discountPct(p) > 0 && (
                    <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">-{discountPct(p)}%</span>
                  )}
                  {p.badge && (
                    <span className="absolute top-2 left-2 bg-neutral-900/85 text-white text-[11px] font-medium px-2 py-1 rounded-full">{p.badge}</span>
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm text-neutral-900 line-clamp-2 min-h-[2.5rem]">{p.name}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-emerald-600 font-extrabold">{fmt(p.price)} دج</span>
                    {p.oldPrice > p.price && <span className="text-neutral-400 text-xs line-through">{fmt(p.oldPrice)}</span>}
                  </div>
                  <Button size="sm" className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                    <ShoppingCart className="h-4 w-4 ml-1" /> اطلب الآن
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t bg-white mt-8">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-neutral-500">
          © {new Date().getFullYear()} DZ Store — جميع الحقوق محفوظة
        </div>
      </footer>
    </div>
  )

  /* =================== PRODUCT =================== */
  const renderProduct = () => {
    if (!selected) return null
    const p = selected
    return (
      <div className="min-h-screen bg-neutral-50 pb-24">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
          <div className="mx-auto max-w-5xl px-4 h-14 flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goStore}><ArrowRight className="h-5 w-5" /></Button>
            <span className="font-bold text-neutral-900">تفاصيل المنتج</span>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-5 grid md:grid-cols-2 gap-6">
          <div>
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border">
              {p.images?.[activeImg] ? (
                <img src={p.images[activeImg]} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center text-neutral-300"><Package className="h-16 w-16" /></div>
              )}
              {discountPct(p) > 0 && (
                <span className="absolute top-3 right-3 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">خصم {discountPct(p)}%</span>
              )}
            </div>
            {p.images?.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {p.images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)} className={`h-16 w-16 rounded-xl overflow-hidden border-2 flex-shrink-0 ${activeImg === i ? 'border-emerald-600' : 'border-transparent'}`}>
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {p.badge && <Badge className="bg-emerald-100 text-emerald-700 border-0 mb-2">{p.badge}</Badge>}
            <h1 className="text-xl font-extrabold text-neutral-900">{p.name}</h1>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-2xl font-extrabold text-emerald-600">{fmt(p.price)} دج</span>
              {p.oldPrice > p.price && <span className="text-neutral-400 line-through">{fmt(p.oldPrice)} دج</span>}
            </div>
            <p className="text-neutral-600 text-sm mt-3 leading-relaxed whitespace-pre-line">{p.description}</p>

            <div className="grid grid-cols-3 gap-2 mt-4">
              {[['توصيل 58 ولاية', Truck], ['دفع عند الاستلام', ShieldCheck], ['جودة مضمونة', CheckCircle2]].map(([t, Icon], i) => (
                <div key={i} className="rounded-xl bg-white border p-2 text-center">
                  <Icon className="h-5 w-5 mx-auto text-emerald-600" />
                  <div className="text-[11px] text-neutral-600 mt-1">{t}</div>
                </div>
              ))}
            </div>

            <Card className="mt-5 rounded-2xl border-emerald-200">
              <CardContent className="p-4">
                <h3 className="font-bold text-neutral-900 mb-3 flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-emerald-600" /> أكمل الطلب</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-neutral-600 mb-1 flex items-center gap-1"><User className="h-3.5 w-3.5" /> الاسم الكامل</Label>
                    <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="مثال: محمد أمين" className="rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs text-neutral-600 mb-1 flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> رقم الهاتف</Label>
                    <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0X XX XX XX XX" inputMode="tel" className="rounded-xl" dir="ltr" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-neutral-600 mb-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> الولاية</Label>
                      <select value={form.wilaya} onChange={e => setForm({ ...form, wilaya: e.target.value })} className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm">
                        <option value="">اختر الولاية</option>
                        {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-neutral-600 mb-1">البلدية</Label>
                      <Input value={form.commune} onChange={e => setForm({ ...form, commune: e.target.value })} placeholder="البلدية" className="rounded-xl" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-neutral-600 mb-1">ملاحظات (اختياري)</Label>
                    <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="أي تفاصيل إضافية..." className="rounded-xl min-h-[60px]" />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm text-neutral-600">الكمية</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setQty(q => Math.max(1, q - 1))} className="h-8 w-8 rounded-lg border grid place-items-center"><Minus className="h-4 w-4" /></button>
                      <span className="font-bold w-6 text-center">{qty}</span>
                      <button onClick={() => setQty(q => q + 1)} className="h-8 w-8 rounded-lg border grid place-items-center"><Plus className="h-4 w-4" /></button>
                    </div>
                  </div>

                  <div className="space-y-1 border-t pt-3">
                    <div className="flex items-center justify-between text-sm text-neutral-600">
                      <span>سعر المنتجات</span><span>{fmt(p.price * qty)} دج</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-neutral-600">
                      <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> رسوم التوصيل</span>
                      <span>{form.wilaya ? `${fmt(feeFor(form.wilaya))} دج` : 'اختر الولاية أولاً'}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t mt-1">
                      <span className="text-sm font-semibold text-neutral-800">المجموع الكلي</span>
                      <span className="text-xl font-extrabold text-emerald-600">{fmt(p.price * qty + (form.wilaya ? feeFor(form.wilaya) : 0))} دج</span>
                    </div>
                  </div>

                  <Button onClick={placeOrder} disabled={placing} className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                    {placing ? <Loader2 className="h-5 w-5 animate-spin" /> : <>تأكيد الطلب — الدفع عند الاستلام</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t p-3 z-30 flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] text-neutral-500">{form.wilaya ? 'المجموع الكلي' : 'سعر المنتجات'}</div>
            <div className="font-extrabold text-emerald-600">{fmt(p.price * qty + (form.wilaya ? feeFor(form.wilaya) : 0))} دج</div>
          </div>
          <Button onClick={placeOrder} disabled={placing} className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 rounded-xl">
            {placing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'تأكيد الطلب'}
          </Button>
        </div>
      </div>
    )
  }

  /* =================== SUCCESS =================== */
  const renderSuccess = () => (
    <div className="min-h-screen bg-neutral-50 grid place-items-center px-4 py-10">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto h-20 w-20 rounded-full bg-emerald-100 grid place-items-center mb-4 animate-in zoom-in duration-500">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-neutral-900">تم تأكيد طلبك بنجاح! 🎉</h1>
        <p className="text-neutral-600 mt-2 text-sm">شكراً لك. سنتصل بك قريباً على هاتفك لتأكيد التوصيل. الدفع عند الاستلام.</p>
        {lastOrder && (
          <Card className="mt-5 rounded-2xl text-right">
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">رقم الطلب</span><span className="font-bold" dir="ltr">{lastOrder.orderNumber}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">المنتج</span><span className="font-medium">{lastOrder.productName}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">الكمية</span><span>{lastOrder.quantity}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">الولاية</span><span>{lastOrder.wilaya}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">رسوم التوصيل</span><span>{fmt(lastOrder.deliveryFee || 0)} دج</span></div>
              <div className="flex justify-between border-t pt-2"><span className="text-neutral-500">المبلغ الإجمالي</span><span className="font-extrabold text-emerald-600">{fmt(lastOrder.total)} دج</span></div>
            </CardContent>
          </Card>
        )}
        <Button onClick={goStore} className="mt-5 w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl">متابعة التسوق</Button>
      </div>
    </div>
  )

  /* =================== ADMIN =================== */
  const renderAdminLogin = () => (
    <div className="min-h-screen bg-neutral-50 grid place-items-center px-4">
      <Card className="max-w-sm w-full rounded-2xl">
        <CardContent className="p-6">
          <div className="text-center mb-5">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-600 grid place-items-center text-white mb-3"><Lock className="h-7 w-7" /></div>
            <h1 className="text-xl font-extrabold">لوحة التحكم</h1>
            <p className="text-sm text-neutral-500">أدخل كلمة المرور للمتابعة</p>
          </div>
          <Input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && adminLogin()} placeholder="كلمة المرور" className="rounded-xl mb-3" dir="ltr" />
          <Button onClick={adminLogin} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 rounded-xl">دخول</Button>
          <Button variant="ghost" onClick={goStore} className="w-full mt-2 text-neutral-500">العودة إلى المتجر</Button>
        </CardContent>
      </Card>
    </div>
  )

  const renderAdmin = () => {
    if (!adminToken) return renderAdminLogin()
    const filtered = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter)
    return (
      <div className="min-h-screen bg-neutral-50">
        <header className="sticky top-0 z-30 bg-white border-b">
          <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-emerald-600 grid place-items-center text-white"><LayoutDashboard className="h-5 w-5" /></div>
              <span className="font-extrabold">لوحة التحكم</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goStore} className="rounded-xl">المتجر</Button>
              <Button variant="ghost" size="sm" onClick={adminLogout} className="text-red-600"><LogOut className="h-4 w-4 ml-1" /> خروج</Button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-5">
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <StatCard icon={ClipboardList} label="إجمالي الطلبات" value={stats.totalOrders} color="bg-blue-500" />
              <StatCard icon={TrendingUp} label="الإيرادات (دج)" value={fmt(stats.totalRevenue)} color="bg-emerald-500" />
              <StatCard icon={Package} label="المنتجات" value={stats.productsCount} color="bg-purple-500" />
              <StatCard icon={CheckCircle2} label="طلبات جديدة" value={stats.byStatus?.new || 0} color="bg-amber-500" />
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <Button variant={adminTab === 'orders' ? 'default' : 'outline'} onClick={() => setAdminTab('orders')} className={`rounded-xl ${adminTab === 'orders' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}><ClipboardList className="h-4 w-4 ml-1" /> الطلبات</Button>
            <Button variant={adminTab === 'products' ? 'default' : 'outline'} onClick={() => setAdminTab('products')} className={`rounded-xl ${adminTab === 'products' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}><Package className="h-4 w-4 ml-1" /> المنتجات</Button>
          </div>

          {adminTab === 'orders' ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex flex-wrap gap-2">
                  {[['all', 'الكل'], ['new', 'جديد'], ['confirmed', 'مؤكد'], ['shipped', 'تم الشحن'], ['cancelled', 'ملغى']].map(([k, l]) => (
                    <button key={k} onClick={() => setOrderFilter(k)} className={`text-xs px-3 py-1.5 rounded-full border ${orderFilter === k ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600'}`}>{l}</button>
                  ))}
                </div>
                <Button onClick={exportCSV} size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><Download className="h-4 w-4 ml-1" /> تصدير Excel/CSV</Button>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-16 text-neutral-500 bg-white rounded-2xl border">لا توجد طلبات</div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(o => (
                    <Card key={o.id} className="rounded-2xl">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {o.productImage && <img src={o.productImage} alt="" className="h-16 w-16 rounded-xl object-cover border" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-sm truncate">{o.productName}</span>
                              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS[o.status]?.cls}`}>{STATUS[o.status]?.label}</span>
                            </div>
                            <div className="text-xs text-neutral-500 mt-0.5" dir="ltr">#{o.orderNumber}</div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-neutral-700">
                              <span className="flex items-center gap-1"><User className="h-3 w-3 text-neutral-400" /> {o.fullName}</span>
                              <span className="flex items-center gap-1" dir="ltr"><Phone className="h-3 w-3 text-neutral-400" /> {o.phone}</span>
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-neutral-400" /> {o.wilaya}</span>
                              <span className="flex items-center gap-1">🏘️ {o.commune}</span>
                              <span>الكمية: {o.quantity}</span>
                              <span className="font-bold text-emerald-600">{fmt(o.total)} دج</span>
                            </div>
                            {o.notes && <div className="text-xs text-neutral-500 mt-1">📝 {o.notes}</div>}
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {Object.entries(STATUS).map(([k, v]) => (
                                <button key={k} onClick={() => updateOrderStatus(o.id, k)} className={`text-[11px] px-2.5 py-1 rounded-full border ${o.status === k ? v.cls + ' font-bold' : 'bg-white text-neutral-500'}`}>{v.label}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-neutral-500">{products.length} منتج</span>
                <Button onClick={() => openProductDialog(null)} size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 ml-1" /> إضافة منتج</Button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {products.map(p => (
                  <Card key={p.id} className="rounded-2xl overflow-hidden">
                    <div className="aspect-video bg-neutral-100">
                      {p.images?.[0] ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" /> : <div className="h-full grid place-items-center text-neutral-300"><Package className="h-8 w-8" /></div>}
                    </div>
                    <CardContent className="p-3">
                      <div className="font-semibold text-sm line-clamp-1">{p.name}</div>
                      <div className="text-emerald-600 font-bold text-sm mt-1">{fmt(p.price)} دج {p.stock != null && <span className="text-xs text-neutral-400 font-normal">• مخزون {p.stock}</span>}</div>
                      <div className="flex gap-1.5 mt-3">
                        <Button size="sm" variant="outline" onClick={() => copyLink(p.id)} className="flex-1 rounded-lg text-xs"><Copy className="h-3.5 w-3.5 ml-1" /> نسخ الرابط</Button>
                        <Button size="sm" variant="outline" onClick={() => openProductDialog(p)} className="rounded-lg"><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => deleteProduct(p.id)} className="rounded-lg text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <Dialog open={prodDialog} onOpenChange={setProdDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader><DialogTitle className="text-right">{editingId ? 'تعديل المنتج' : 'إضافة منتج جديد'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-1 block">اسم المنتج</Label>
                <Input value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })} className="rounded-xl" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">الوصف</Label>
                <Textarea value={pForm.description} onChange={e => setPForm({ ...pForm, description: e.target.value })} className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">السعر (دج)</Label>
                  <Input type="number" value={pForm.price} onChange={e => setPForm({ ...pForm, price: e.target.value })} className="rounded-xl" dir="ltr" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">السعر القديم (اختياري)</Label>
                  <Input type="number" value={pForm.oldPrice} onChange={e => setPForm({ ...pForm, oldPrice: e.target.value })} className="rounded-xl" dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">شارة (مثل: جديد)</Label>
                  <Input value={pForm.badge} onChange={e => setPForm({ ...pForm, badge: e.target.value })} className="rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">المخزون</Label>
                  <Input type="number" value={pForm.stock} onChange={e => setPForm({ ...pForm, stock: e.target.value })} className="rounded-xl" dir="ltr" />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block">صور المنتج</Label>
                <div className="flex flex-wrap gap-2">
                  {pForm.images.map((img, i) => (
                    <div key={i} className="relative h-20 w-20 rounded-xl overflow-hidden border">
                      <img src={img} alt="" className="h-full w-full object-cover" />
                      <button onClick={() => setPForm({ ...pForm, images: pForm.images.filter((_, x) => x !== i) })} className="absolute top-0.5 left-0.5 bg-red-500 text-white rounded-full h-5 w-5 grid place-items-center"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  <label className="h-20 w-20 rounded-xl border-2 border-dashed grid place-items-center cursor-pointer text-neutral-400 hover:border-emerald-400">
                    <ImagePlus className="h-6 w-6" />
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleImageUpload(e.target.files)} />
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={saveProduct} disabled={savingProduct} className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                {savingProduct ? <Loader2 className="h-5 w-5 animate-spin" /> : 'حفظ المنتج'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (view === 'product') return renderProduct()
  if (view === 'success') return renderSuccess()
  if (view === 'admin') return renderAdmin()
  return renderStore()
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-11 w-11 rounded-xl ${color} grid place-items-center text-white`}><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-xl font-extrabold text-neutral-900">{value}</div>
          <div className="text-xs text-neutral-500">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}
