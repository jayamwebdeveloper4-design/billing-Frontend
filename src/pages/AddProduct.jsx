import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/productApi';
import ConfirmationModal from '../components/ConfirmationModal';

// ── ID generator ──────────────────────────────────────────────────────────────
const generateId = () => Math.random().toString(36).substr(2, 9);

// ── Shared UI Primitives ──────────────────────────────────────────────────────
const PriceInput = ({ value, onChange, placeholder = '0', label }) => (
  <div className="w-full">
    {label && <span className="block text-[11px] font-semibold text-on-surface-variant mb-1">{label}</span>}
    <div className="relative">
      <span className="absolute left-sm top-1/2 -translate-y-1/2 font-body-sm text-body-sm text-on-surface-variant font-medium">₹</span>
      <input
        type="number"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full pl-8 pr-md py-sm rounded-lg text-sm font-semibold border border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/40 placeholder:font-normal focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary transition-all shadow-xs"
      />
    </div>
  </div>
);

const PlanTypeToggle = ({ hasPlan, onToggle }) => (
  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-on-surface select-none bg-surface-container-low px-md py-2 rounded-xl border border-outline-variant/40 hover:bg-surface-container-high transition-colors">
    <input
      type="radio"
      name="subcategory-configuration"
      checked={!!hasPlan}
      onChange={() => onToggle(true)}
      className="w-4 h-4 text-primary focus:ring-primary accent-primary cursor-pointer"
    />
    <span>With Plan (Multiple Plans)</span>
  </label>
);

// ── Legacy Normalization Helper ───────────────────────────────────────────────
const normalizeProduct = (product) => {
  let subCats = [];
  if (product.subCategories && product.subCategories.length > 0) {
    subCats = product.subCategories.map(sc => ({
      id: sc.id || sc._id || generateId(),
      name: sc.name || '',
      oneTimePayment: !!sc.oneTimePayment,
      hasPlan: !sc.oneTimePayment && !!sc.hasPlan,
      hasRenewal: !sc.oneTimePayment && sc.hasRenewal !== false,
      costPrice: sc.costPrice != null ? String(sc.costPrice) : '',
      costPriceRenewal: sc.costPriceRenewal != null ? String(sc.costPriceRenewal) : '',
      sellerPrice: sc.sellerPrice != null ? String(sc.sellerPrice) : '',
      sellerPriceRenewal: sc.sellerPriceRenewal != null ? String(sc.sellerPriceRenewal) : '',
      plans: (sc.plans || []).map(p => ({
        id: p.id || p._id || generateId(),
        name: p.name || '',
        hasRenewal: p.hasRenewal !== false,
        costPrice: p.costPrice != null ? String(p.costPrice) : '',
        costPriceRenewal: p.costPriceRenewal != null ? String(p.costPriceRenewal) : '',
        sellerPrice: p.sellerPrice != null ? String(p.sellerPrice) : '',
        sellerPriceRenewal: p.sellerPriceRenewal != null ? String(p.sellerPriceRenewal) : '',
      })),
    }));
  } else if (product.variants?.length > 0) {
    subCats = product.variants.map(v => ({
      id: generateId(),
      name: v.name || '',
      oneTimePayment: false,
      hasPlan: true,
      hasRenewal: true,
      costPrice: '',
      costPriceRenewal: '',
      sellerPrice: '',
      sellerPriceRenewal: '',
      plans: (v.options || []).map(o => ({
        id: generateId(),
        name: o.value || o.name || '',
        hasRenewal: true,
        costPrice: o.costPrice != null ? String(o.costPrice) : '',
        costPriceRenewal: o.costPriceRenewal != null ? String(o.costPriceRenewal) : '',
        sellerPrice: o.sellerPrice != null ? String(o.sellerPrice) : '',
        sellerPriceRenewal: o.sellerPriceRenewal != null ? String(o.sellerPriceRenewal) : '',
      })),
    }));
  } else if (product.subVariants?.length > 0) {
    product.subVariants.forEach(group => {
      (group.subVariants || []).forEach(sub => {
        subCats.push({
          id: generateId(),
          name: `${group.variantName} - ${sub.name}`,
          oneTimePayment: false,
          hasPlan: true,
          hasRenewal: true,
          costPrice: '',
          costPriceRenewal: '',
          sellerPrice: '',
          sellerPriceRenewal: '',
          plans: (sub.options || []).map(o => ({
            id: generateId(),
            name: o.name || '',
            hasRenewal: true,
            costPrice: o.costPrice != null ? String(o.costPrice) : '',
            costPriceRenewal: o.costPriceRenewal != null ? String(o.costPriceRenewal) : '',
            sellerPrice: o.sellerPrice != null ? String(o.sellerPrice) : '',
            sellerPriceRenewal: o.sellerPriceRenewal != null ? String(o.sellerPriceRenewal) : '',
          })),
        });
      });
    });
  } else if (product.packages?.length > 0) {
    subCats = [
      {
        id: generateId(),
        name: 'Package Plan',
        oneTimePayment: false,
        hasPlan: true,
        hasRenewal: true,
        costPrice: '',
        costPriceRenewal: '',
        sellerPrice: '',
        sellerPriceRenewal: '',
        plans: product.packages.map(pk => ({
          id: generateId(),
          name: pk.name || '',
          hasRenewal: true,
          costPrice: pk.costPrice != null ? String(pk.costPrice) : '',
          costPriceRenewal: pk.costPriceRenewal != null ? String(pk.costPriceRenewal) : '',
          sellerPrice: pk.sellerPrice != null ? String(pk.sellerPrice) : '',
          sellerPriceRenewal: pk.sellerPriceRenewal != null ? String(pk.sellerPriceRenewal) : '',
        })),
      },
    ];
  }
  return { ...product, subCategories: subCats };
};

// ── Backend Payload Builder ───────────────────────────────────────────────────
const buildProductPayload = (categoryObj) => {
  return {
    name: categoryObj.name.trim(),
    subCategories: (categoryObj.subCategories || []).map(sc => {
      const isOneTimePayment = !!sc.oneTimePayment;

      if (isOneTimePayment) {
        return {
          name: sc.name.trim(),
          oneTimePayment: true,
          hasPlan: false,
          hasRenewal: false,
          costPrice: null,
          sellerPrice: null,
        };
      }

      const scHasRenewal = sc.hasRenewal !== false;
      const subCat = {
        name: sc.name.trim(),
        oneTimePayment: false,
        hasPlan: !!sc.hasPlan,
        hasRenewal: scHasRenewal,
        costPrice: !sc.hasPlan ? Number(sc.costPrice) || 0 : null,
        costPriceRenewal: !sc.hasPlan && scHasRenewal ? Number(sc.costPriceRenewal) || 0 : null,
        sellerPrice: !sc.hasPlan ? Number(sc.sellerPrice) || 0 : null,
        sellerPriceRenewal: !sc.hasPlan && scHasRenewal ? Number(sc.sellerPriceRenewal) || 0 : null,
      };

      if (sc.hasPlan) {
        subCat.plans = (sc.plans || []).map(p => {
          const pHasRenewal = p.hasRenewal !== false;
          return {
            name: p.name.trim(),
            hasRenewal: pHasRenewal,
            costPrice: Number(p.costPrice) || 0,
            costPriceRenewal: pHasRenewal ? Number(p.costPriceRenewal) || 0 : null,
            sellerPrice: Number(p.sellerPrice) || 0,
            sellerPriceRenewal: pHasRenewal ? Number(p.sellerPriceRenewal) || 0 : null,
          };
        });
      }

      return subCat;
    }),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
const AddProduct = () => {
  // Navigation level: 'categories' | 'subcategories' | 'plans'
  const [navigationLevel, setNavigationLevel] = useState('categories');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Active Selections for Navigation Hierarchy
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);

  // Modal States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalData, setCategoryModalData] = useState({ _id: null, name: '' });

  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [subCategoryModalData, setSubCategoryModalData] = useState({
    id: null,
    name: '',
    oneTimePayment: false,
    hasPlan: false,
    hasRenewal: true,
    costPrice: '',
    costPriceRenewal: '',
    sellerPrice: '',
    sellerPriceRenewal: '',
  });

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planModalData, setPlanModalData] = useState({
    id: null,
    name: '',
    hasRenewal: true,
    costPrice: '',
    costPriceRenewal: '',
    sellerPrice: '',
    sellerPriceRenewal: '',
  });

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState({ type: null, item: null, title: '', message: '' });

  // ── Fetch Products ───────────────────────────────────────────────
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      const normalized = (data || []).map(normalizeProduct);
      setProducts(normalized);

      // Keep selected category updated if currently viewing subcategories/plans
      if (selectedCategory) {
        const foundCat = normalized.find(p => p._id === selectedCategory._id);
        if (foundCat) {
          setSelectedCategory(foundCat);
          if (selectedSubCategory) {
            const foundSub = foundCat.subCategories?.find(sc => sc.id === selectedSubCategory.id || sc.name === selectedSubCategory.name);
            if (foundSub) setSelectedSubCategory(foundSub);
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load products catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // CATEGORY MODAL HANDLERS
  // ══════════════════════════════════════════════════════════════════════════
  const handleOpenAddCategory = () => {
    setCategoryModalData({ _id: null, name: '' });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat) => {
    setCategoryModalData({ _id: cat._id, name: cat.name });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryModalData.name.trim()) {
      toast.error('Category Name is required');
      return;
    }

    try {
      if (categoryModalData._id) {
        // Edit Category
        const catToEdit = products.find(p => p._id === categoryModalData._id);
        const updatedCat = { ...catToEdit, name: categoryModalData.name.trim() };
        await updateProduct(categoryModalData._id, buildProductPayload(updatedCat));
        toast.success('Category updated successfully!');
      } else {
        // Add Category
        await createProduct({ name: categoryModalData.name.trim(), subCategories: [] });
        toast.success('Category created successfully!');
      }
      setIsCategoryModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save category');
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SUB-CATEGORY MODAL HANDLERS
  // ══════════════════════════════════════════════════════════════════════════
  const handleOpenAddSubCategory = () => {
    setSubCategoryModalData({
      id: null,
      name: '',
      oneTimePayment: false,
      hasPlan: false,
      hasRenewal: true,
      costPrice: '',
      costPriceRenewal: '',
      sellerPrice: '',
      sellerPriceRenewal: '',
    });
    setIsSubCategoryModalOpen(true);
  };

  const handleOpenEditSubCategory = (sc) => {
    const isOneTime = !!sc.oneTimePayment;
    setSubCategoryModalData({
      id: sc.id,
      name: sc.name || '',
      oneTimePayment: isOneTime,
      hasPlan: !isOneTime && !!sc.hasPlan,
      hasRenewal: !isOneTime && sc.hasRenewal !== false,
      costPrice: sc.costPrice || '',
      costPriceRenewal: sc.costPriceRenewal || '',
      sellerPrice: sc.sellerPrice || '',
      sellerPriceRenewal: sc.sellerPriceRenewal || '',
    });
    setIsSubCategoryModalOpen(true);
  };

  const handleSaveSubCategory = async () => {
    if (!subCategoryModalData.name.trim()) {
      toast.error('Sub-Category Name is required');
      return;
    }

    if (!subCategoryModalData.oneTimePayment && !subCategoryModalData.hasPlan && subCategoryModalData.sellerPrice === '') {
      toast.error('Please enter Selling Price');
      return;
    }

    try {
      const currentSubCats = selectedCategory.subCategories || [];
      let updatedSubCats = [];

      if (subCategoryModalData.id) {
        // Edit Sub-Category
        updatedSubCats = currentSubCats.map(sc => {
          if (sc.id === subCategoryModalData.id) {
            return {
              ...sc,
              name: subCategoryModalData.name.trim(),
              oneTimePayment: subCategoryModalData.oneTimePayment,
              hasPlan: subCategoryModalData.oneTimePayment ? false : subCategoryModalData.hasPlan,
              hasRenewal: subCategoryModalData.oneTimePayment ? false : subCategoryModalData.hasRenewal,
              costPrice: subCategoryModalData.oneTimePayment ? '' : subCategoryModalData.costPrice,
              costPriceRenewal: subCategoryModalData.oneTimePayment ? '' : subCategoryModalData.costPriceRenewal,
              sellerPrice: subCategoryModalData.oneTimePayment ? '' : subCategoryModalData.sellerPrice,
              sellerPriceRenewal: subCategoryModalData.oneTimePayment ? '' : subCategoryModalData.sellerPriceRenewal,
            };
          }
          return sc;
        });
      } else {
        // Add New Sub-Category
        const newSubCat = {
          id: generateId(),
          name: subCategoryModalData.name.trim(),
          oneTimePayment: subCategoryModalData.oneTimePayment,
          hasPlan: subCategoryModalData.oneTimePayment ? false : subCategoryModalData.hasPlan,
          hasRenewal: subCategoryModalData.oneTimePayment ? false : subCategoryModalData.hasRenewal,
          costPrice: subCategoryModalData.oneTimePayment ? '' : subCategoryModalData.costPrice,
          costPriceRenewal: subCategoryModalData.oneTimePayment ? '' : subCategoryModalData.costPriceRenewal,
          sellerPrice: subCategoryModalData.oneTimePayment ? '' : subCategoryModalData.sellerPrice,
          sellerPriceRenewal: subCategoryModalData.oneTimePayment ? '' : subCategoryModalData.sellerPriceRenewal,
          plans: (!subCategoryModalData.oneTimePayment && subCategoryModalData.hasPlan) ? [] : [],
        };
        updatedSubCats = [...currentSubCats, newSubCat];
      }

      const updatedCat = { ...selectedCategory, subCategories: updatedSubCats };
      await updateProduct(selectedCategory._id, buildProductPayload(updatedCat));

      toast.success(subCategoryModalData.id ? 'Sub-Category updated!' : 'Sub-Category created!');
      setIsSubCategoryModalOpen(false);
      setSelectedCategory(updatedCat);

      // Update in main list
      setProducts(prev => prev.map(p => (p._id === updatedCat._id ? updatedCat : p)));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save sub-category');
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PLAN MODAL HANDLERS
  // ══════════════════════════════════════════════════════════════════════════
  const handleOpenAddPlan = () => {
    const parentHasRenewal = selectedSubCategory?.hasRenewal !== false;
    setPlanModalData({
      id: null,
      name: '',
      hasRenewal: parentHasRenewal,
      costPrice: '',
      costPriceRenewal: '',
      sellerPrice: '',
      sellerPriceRenewal: '',
    });
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (plan) => {
    const parentHasRenewal = selectedSubCategory?.hasRenewal !== false;
    setPlanModalData({
      id: plan.id,
      name: plan.name || '',
      hasRenewal: parentHasRenewal ? (plan.hasRenewal !== false) : false,
      costPrice: plan.costPrice || '',
      costPriceRenewal: plan.costPriceRenewal || '',
      sellerPrice: plan.sellerPrice || '',
      sellerPriceRenewal: plan.sellerPriceRenewal || '',
    });
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async () => {
    if (!planModalData.name.trim()) {
      toast.error('Plan Name is required');
      return;
    }
    if (planModalData.sellerPrice === '') {
      toast.error('Please enter Selling Price for the Plan');
      return;
    }

    try {
      const currentPlans = selectedSubCategory.plans || [];
      let updatedPlans = [];

      if (planModalData.id) {
        // Edit Plan
        updatedPlans = currentPlans.map(p => {
          if (p.id === planModalData.id) {
            return {
              ...p,
              name: planModalData.name.trim(),
              hasRenewal: planModalData.hasRenewal,
              costPrice: planModalData.costPrice,
              costPriceRenewal: planModalData.costPriceRenewal,
              sellerPrice: planModalData.sellerPrice,
              sellerPriceRenewal: planModalData.sellerPriceRenewal,
            };
          }
          return p;
        });
      } else {
        // Add Plan
        const newPlan = {
          id: generateId(),
          name: planModalData.name.trim(),
          hasRenewal: planModalData.hasRenewal,
          costPrice: planModalData.costPrice,
          costPriceRenewal: planModalData.costPriceRenewal,
          sellerPrice: planModalData.sellerPrice,
          sellerPriceRenewal: planModalData.sellerPriceRenewal,
        };
        updatedPlans = [...currentPlans, newPlan];
      }

      const updatedSubCat = { ...selectedSubCategory, plans: updatedPlans };
      const updatedSubCats = (selectedCategory.subCategories || []).map(sc =>
        sc.id === updatedSubCat.id ? updatedSubCat : sc
      );
      const updatedCat = { ...selectedCategory, subCategories: updatedSubCats };

      await updateProduct(selectedCategory._id, buildProductPayload(updatedCat));

      toast.success(planModalData.id ? 'Plan updated!' : 'Plan added!');
      setIsPlanModalOpen(false);
      setSelectedSubCategory(updatedSubCat);
      setSelectedCategory(updatedCat);

      setProducts(prev => prev.map(p => (p._id === updatedCat._id ? updatedCat : p)));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save plan');
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // DELETE HANDLERS
  // ══════════════════════════════════════════════════════════════════════════
  const handleConfirmDelete = async () => {
    if (!deleteConfig.item) return;

    try {
      if (deleteConfig.type === 'category') {
        await deleteProduct(deleteConfig.item._id);
        toast.success('Category deleted');
        fetchProducts();
      } else if (deleteConfig.type === 'subcategory') {
        const updatedSubCats = (selectedCategory.subCategories || []).filter(sc => sc.id !== deleteConfig.item.id);
        const updatedCat = { ...selectedCategory, subCategories: updatedSubCats };
        await updateProduct(selectedCategory._id, buildProductPayload(updatedCat));
        toast.success('Sub-Category deleted');
        setSelectedCategory(updatedCat);
        setProducts(prev => prev.map(p => (p._id === updatedCat._id ? updatedCat : p)));
      } else if (deleteConfig.type === 'plan') {
        const updatedPlans = (selectedSubCategory.plans || []).filter(p => p.id !== deleteConfig.item.id);
        const updatedSubCat = { ...selectedSubCategory, plans: updatedPlans };
        const updatedSubCats = (selectedCategory.subCategories || []).map(sc =>
          sc.id === updatedSubCat.id ? updatedSubCat : sc
        );
        const updatedCat = { ...selectedCategory, subCategories: updatedSubCats };
        await updateProduct(selectedCategory._id, buildProductPayload(updatedCat));
        toast.success('Plan deleted');
        setSelectedSubCategory(updatedSubCat);
        setSelectedCategory(updatedCat);
        setProducts(prev => prev.map(p => (p._id === updatedCat._id ? updatedCat : p)));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete item');
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteConfig({ type: null, item: null, title: '', message: '' });
    }
  };

  // ── Breadcrumb Component ────────────────────────────────────────────────────
  const BreadcrumbNav = () => (
    <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-on-surface-variant mb-md flex-wrap">
      <button
        onClick={() => {
          setNavigationLevel('categories');
          setSelectedCategory(null);
          setSelectedSubCategory(null);
          setSearchQuery('');
        }}
        className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
      >
        <span className="material-symbols-outlined text-[18px]">category</span>
        Categories
      </button>

      {(navigationLevel === 'subcategories' || navigationLevel === 'plans') && (
        <>
          <span className="material-symbols-outlined text-[16px] text-outline-variant">chevron_right</span>
          <button
            onClick={() => {
              setNavigationLevel('subcategories');
              setSelectedSubCategory(null);
              setSearchQuery('');
            }}
            className={`hover:text-primary transition-colors cursor-pointer ${
              navigationLevel === 'subcategories' ? 'text-primary font-black' : ''
            }`}
          >
            {selectedCategory?.name}
          </button>
        </>
      )}

      {navigationLevel === 'plans' && (
        <>
          <span className="material-symbols-outlined text-[16px] text-outline-variant">chevron_right</span>
          <span className="text-primary font-black">{selectedSubCategory?.name} (Plans)</span>
        </>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // LEVEL 1: CATEGORIES VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (navigationLevel === 'categories') {
    const filteredCategories = products.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        p.name?.toLowerCase().includes(q) ||
        p.subCategories?.some(
          sc =>
            sc.name?.toLowerCase().includes(q) ||
            sc.plans?.some(plan => plan.name?.toLowerCase().includes(q))
        )
      );
    });

    return (
      <div className="space-y-md md:space-y-lg pb-20 max-w-full overflow-x-hidden animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md mb-lg md:mb-xl">
          <div>
            <h1 className="text-2xl md:text-h1 font-bold text-on-surface">Products & Services</h1>
            <p className="text-on-surface-variant text-xs md:text-body-md">
              Manage product categories and click <strong className="text-primary">Manage Sub-Categories</strong> to configure sub-types & pricing plans.
            </p>
          </div>
          <button
            onClick={handleOpenAddCategory}
            className="w-full sm:w-auto bg-primary text-on-primary px-lg md:px-xl py-sm rounded-full font-bold flex items-center justify-center gap-sm hover:shadow-lg transition-all active:scale-95 cursor-pointer shadow-md flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Category
          </button>
        </div>

        {/* Search */}
        <div className="mb-lg grow relative w-full sm:max-w-[500px] p-1">
          <span className="material-symbols-outlined absolute left-[18px] top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search categories..."
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-[44px] pr-md py-sm font-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-md">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-on-surface-variant font-body-md">Loading categories...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 mb-md">
              category
            </span>
            <h3 className="font-h3 text-h3 text-on-surface mb-xs">No categories found</h3>
            <p className="font-body-md text-body-md text-on-surface-variant/70 mb-lg">
              Get started by adding your first Category.
            </p>
            <button
              onClick={handleOpenAddCategory}
              className="bg-primary text-on-primary px-xl py-sm rounded-full font-bold inline-flex items-center gap-sm hover:shadow-lg transition-all cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Add Category
            </button>
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low">
                    <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase w-1/3">
                      Category Name
                    </th>
                    <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase w-1/3">
                      Sub-Categories
                    </th>
                    <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase text-right w-1/3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-lg text-center text-on-surface-variant font-body-md">
                        No matching categories found.
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map(product => {
                      const subCats = product.subCategories || [];
                      const subCatCount = subCats.length;

                      return (
                        <tr key={product._id} className="hover:bg-surface-container-low/35 transition-colors">
                          <td className="py-md px-gutter font-body-md text-on-surface font-bold text-base">
                            {product.name}
                          </td>
                          <td className="py-md px-gutter">
                            <span className="px-sm py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                              {subCatCount} Sub-Categor{subCatCount === 1 ? 'y' : 'ies'}
                            </span>
                          </td>
                          <td className="px-sm md:px-md py-md text-right">
                            <div className="flex items-center justify-end gap-sm">
                              <button
                                onClick={() => {
                                  setSelectedCategory(product);
                                  setNavigationLevel('subcategories');
                                  setSearchQuery('');
                                }}
                                className="px-md py-1.5 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">account_tree</span>
                                Manage Sub-Categories
                              </button>

                              <button
                                onClick={() => handleOpenEditCategory(product)}
                                className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all cursor-pointer"
                                title="Edit Category Name"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>

                              <button
                                onClick={() => {
                                  setDeleteConfig({
                                    type: 'category',
                                    item: product,
                                    title: 'Delete Category?',
                                    message: `Are you sure you want to delete category "${product.name}"? This action cannot be undone.`,
                                  });
                                  setIsDeleteModalOpen(true);
                                }}
                                className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all cursor-pointer"
                                title="Delete Category"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add / Edit Category */}
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-md animate-in fade-in duration-200">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[460px] shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-gutter py-md bg-surface-container-low border-b border-outline-variant">
                <h3 className="font-h3 text-h3 text-on-surface font-bold">
                  {categoryModalData._id ? 'Edit Category Name' : 'Add Category'}
                </h3>
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="p-xs text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors flex cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="p-gutter space-y-md">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hosting, Domain, Software"
                    value={categoryModalData.name}
                    onChange={e => setCategoryModalData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-md py-2.5 text-sm font-semibold text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <div className="px-gutter py-md bg-surface-container-low border-t border-outline-variant flex justify-end gap-sm">
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-md py-2 rounded-lg font-bold text-xs text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCategory}
                  className="px-lg py-2 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  Save Category
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title={deleteConfig.title}
          message={deleteConfig.message}
          confirmText="Delete"
          type="danger"
        />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LEVEL 2: SUB-CATEGORIES VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (navigationLevel === 'subcategories') {
    const subCategoriesList = selectedCategory?.subCategories || [];
    const filteredSubCategories = subCategoriesList.filter(sc => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        sc.name?.toLowerCase().includes(q) ||
        sc.plans?.some(p => p.name?.toLowerCase().includes(q))
      );
    });

    return (
      <div className="space-y-md md:space-y-lg pb-20 max-w-full overflow-x-hidden animate-in fade-in duration-300">
        <BreadcrumbNav />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md mb-lg">
          <div>
            <h1 className="text-2xl md:text-h1 font-bold text-on-surface">
              {selectedCategory?.name} — Sub-Categories
            </h1>
            <p className="text-on-surface-variant text-xs md:text-body-md">
              Manage sub-categories under <strong className="text-primary">{selectedCategory?.name}</strong>.
            </p>
          </div>
          <button
            onClick={handleOpenAddSubCategory}
            className="w-full sm:w-auto bg-primary text-on-primary px-lg md:px-xl py-sm rounded-full font-bold flex items-center justify-center gap-sm hover:shadow-lg transition-all active:scale-95 cursor-pointer shadow-md flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Sub-Category
          </button>
        </div>

        {/* Search */}
        <div className="mb-lg grow relative w-full sm:max-w-[500px] p-1">
          <span className="material-symbols-outlined absolute left-[18px] top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search sub-categories..."
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-[44px] pr-md py-sm font-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {subCategoriesList.length === 0 ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 mb-md">
              account_tree
            </span>
            <h3 className="font-h3 text-h3 text-on-surface mb-xs">No Sub-Categories</h3>
            <p className="font-body-md text-body-md text-on-surface-variant/70 mb-lg">
              Add sub-categories for "{selectedCategory?.name}".
            </p>
            <button
              onClick={handleOpenAddSubCategory}
              className="bg-primary text-on-primary px-xl py-sm rounded-full font-bold inline-flex items-center gap-sm hover:shadow-lg transition-all cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Add Sub-Category
            </button>
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low">
                    <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase w-1/4">
                      Sub-Category Name
                    </th>
                    <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase w-1/4">
                      Type
                    </th>
                    <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase w-1/4">
                      Pricing / Plans
                    </th>
                    <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase text-right w-1/4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {filteredSubCategories.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-lg text-center text-on-surface-variant font-body-md">
                        No matching sub-categories found.
                      </td>
                    </tr>
                  ) : (
                    filteredSubCategories.map(sc => {
                      const plansCount = sc.plans?.length || 0;

                      return (
                        <tr key={sc.id} className="hover:bg-surface-container-low/35 transition-colors">
                          <td className="py-md px-gutter font-body-md text-on-surface font-bold text-base">
                            {sc.name}
                          </td>
                          <td className="py-md px-gutter">
                            <span
                              className={`px-sm py-1 rounded-full text-xs font-bold ${
                                sc.oneTimePayment
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : sc.hasPlan
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-tertiary/15 text-tertiary'
                              }`}
                            >
                              {sc.oneTimePayment ? 'One-Time Payment' : sc.hasPlan ? 'With Plan' : 'Without Plan'}
                            </span>
                          </td>
                          <td className="py-md px-gutter font-body-md text-on-surface-variant">
                            {sc.oneTimePayment ? (
                              <span className="text-xs font-semibold text-on-surface-variant italic">
                                Price entered on customer order
                              </span>
                            ) : sc.hasPlan ? (
                              <span className="font-bold text-on-surface">
                                {plansCount} Plan{plansCount !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              <div className="text-xs space-y-0.5">
                                <div>
                                  <span className="text-on-surface-variant">Selling:</span>{' '}
                                  <strong className="text-success font-bold">₹{sc.sellerPrice || 0}</strong>
                                  {sc.hasRenewal !== false && (
                                    <span className="text-on-surface-variant ml-1">
                                      (Renewal: ₹{sc.sellerPriceRenewal || 0})
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-sm md:px-md py-md text-right">
                            <div className="flex items-center justify-end gap-sm">
                              {sc.hasPlan && (
                                <button
                                  onClick={() => {
                                    setSelectedSubCategory(sc);
                                    setNavigationLevel('plans');
                                    setSearchQuery('');
                                  }}
                                  className="px-md py-1.5 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[16px]">view_list</span>
                                  Manage Plans ({plansCount})
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenEditSubCategory(sc)}
                                className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all cursor-pointer"
                                title="Edit Sub-Category"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>

                              <button
                                onClick={() => {
                                  setDeleteConfig({
                                    type: 'subcategory',
                                    item: sc,
                                    title: 'Delete Sub-Category?',
                                    message: `Are you sure you want to delete sub-category "${sc.name}"?`,
                                  });
                                  setIsDeleteModalOpen(true);
                                }}
                                className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all cursor-pointer"
                                title="Delete Sub-Category"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add / Edit Sub-Category */}
        {isSubCategoryModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-md animate-in fade-in duration-200">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[580px] shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-gutter py-md bg-surface-container-low border-b border-outline-variant">
                <h3 className="font-h3 text-h3 text-on-surface font-bold">
                  {subCategoryModalData.id ? 'Edit Sub-Category' : 'Add Sub-Category'}
                </h3>
                <button
                  onClick={() => setIsSubCategoryModalOpen(false)}
                  className="p-xs text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors flex cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="p-gutter space-y-md">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    Sub-Category Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Linux Hosting, .com Domain"
                    value={subCategoryModalData.name}
                    onChange={e => setSubCategoryModalData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-md py-2.5 text-sm font-semibold text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    autoFocus
                  />
                </div>

                <div className="space-y-sm pt-xs">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Sub-Category Type</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm">
                    {/* Option 1: Direct Pricing */}
                    <label className={`flex items-center gap-2 cursor-pointer text-xs font-bold p-3 rounded-xl border transition-all ${
                      !subCategoryModalData.oneTimePayment && !subCategoryModalData.hasPlan
                        ? 'border-primary bg-primary/5 text-primary shadow-xs'
                        : 'border-outline-variant/40 bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                    }`}>
                      <input
                        type="radio"
                        name="subcategory-type"
                        checked={!subCategoryModalData.oneTimePayment && !subCategoryModalData.hasPlan}
                        onChange={() =>
                          setSubCategoryModalData(prev => ({
                            ...prev,
                            oneTimePayment: false,
                            hasPlan: false,
                            hasRenewal: true,
                          }))
                        }
                        className="w-4 h-4 text-primary focus:ring-primary accent-primary cursor-pointer"
                      />
                      <span>Direct Pricing</span>
                    </label>

                    {/* Option 2: With Plan */}
                    <label className={`flex items-center gap-2 cursor-pointer text-xs font-bold p-3 rounded-xl border transition-all ${
                      !subCategoryModalData.oneTimePayment && subCategoryModalData.hasPlan
                        ? 'border-primary bg-primary/5 text-primary shadow-xs'
                        : 'border-outline-variant/40 bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                    }`}>
                      <input
                        type="radio"
                        name="subcategory-type"
                        checked={!subCategoryModalData.oneTimePayment && subCategoryModalData.hasPlan}
                        onChange={() =>
                          setSubCategoryModalData(prev => ({
                            ...prev,
                            oneTimePayment: false,
                            hasPlan: true,
                            hasRenewal: true,
                          }))
                        }
                        className="w-4 h-4 text-primary focus:ring-primary accent-primary cursor-pointer"
                      />
                      <span>With Plans</span>
                    </label>

                    {/* Option 3: One-Time Payment */}
                    <label className={`flex items-center gap-2 cursor-pointer text-xs font-bold p-3 rounded-xl border transition-all ${
                      subCategoryModalData.oneTimePayment
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'border-outline-variant/40 bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                    }`}>
                      <input
                        type="radio"
                        name="subcategory-type"
                        checked={subCategoryModalData.oneTimePayment}
                        onChange={() =>
                          setSubCategoryModalData(prev => ({
                            ...prev,
                            oneTimePayment: true,
                            hasPlan: false,
                            hasRenewal: false,
                            costPrice: '',
                            costPriceRenewal: '',
                            sellerPrice: '',
                            sellerPriceRenewal: '',
                          }))
                        }
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                      />
                      <span>One-Time Payment</span>
                    </label>
                  </div>
                </div>

                {subCategoryModalData.oneTimePayment && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-md rounded-xl flex items-start gap-sm text-xs text-emerald-800 dark:text-emerald-200">
                    <span className="material-symbols-outlined text-[20px] text-emerald-600 dark:text-emerald-400 shrink-0">info</span>
                    <div>
                      <p className="font-bold">One-Time Payment Sub-Category</p>
                      <p className="opacity-90 mt-0.5">Price is not required in the product catalog. The selling price will be entered when adding this service to a customer order.</p>
                    </div>
                  </div>
                )}

                {!subCategoryModalData.oneTimePayment && subCategoryModalData.hasPlan && (
                  <div className="bg-primary/5 border border-primary/20 p-md rounded-xl flex items-start gap-sm text-xs text-on-surface">
                    <span className="material-symbols-outlined text-[20px] text-primary shrink-0">layers</span>
                    <div>
                      <p className="font-bold text-primary">Multi-Plan Sub-Category</p>
                      <p className="text-on-surface-variant mt-0.5">Pricing will be managed per plan. After saving, click "Manage Plans" to add plans with renewal pricing.</p>
                    </div>
                  </div>
                )}

                {!subCategoryModalData.oneTimePayment && !subCategoryModalData.hasPlan && (
                  <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant/30 space-y-sm">
                    <div className="flex items-center justify-between mb-xs">
                      <span className="text-xs font-bold text-on-surface-variant uppercase">Sub-Category Pricing</span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-on-surface select-none">
                        <input
                          type="checkbox"
                          checked={!!subCategoryModalData.hasRenewal}
                          onChange={e =>
                            setSubCategoryModalData(prev => ({
                              ...prev,
                              hasRenewal: e.target.checked,
                            }))
                          }
                          className="w-3.5 h-3.5 text-primary focus:ring-primary accent-primary rounded cursor-pointer"
                        />
                        <span>Enable Renewal Pricing</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                      <PriceInput
                        label="Selling Price (₹)"
                        placeholder="0"
                        value={subCategoryModalData.sellerPrice}
                        onChange={val => setSubCategoryModalData(prev => ({ ...prev, sellerPrice: val }))}
                      />
                      {subCategoryModalData.hasRenewal && (
                        <PriceInput
                          label="Selling Renewal Price (₹)"
                          placeholder="0"
                          value={subCategoryModalData.sellerPriceRenewal}
                          onChange={val => setSubCategoryModalData(prev => ({ ...prev, sellerPriceRenewal: val }))}
                        />
                      )}
                      <PriceInput
                        label="Cost Price (₹) (Optional)"
                        placeholder="0"
                        value={subCategoryModalData.costPrice}
                        onChange={val => setSubCategoryModalData(prev => ({ ...prev, costPrice: val }))}
                      />
                      {subCategoryModalData.hasRenewal && (
                        <PriceInput
                          label="Cost Renewal Price (₹) (Optional)"
                          placeholder="0"
                          value={subCategoryModalData.costPriceRenewal}
                          onChange={val => setSubCategoryModalData(prev => ({ ...prev, costPriceRenewal: val }))}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-gutter py-md bg-surface-container-low border-t border-outline-variant flex justify-end gap-sm">
                <button
                  onClick={() => setIsSubCategoryModalOpen(false)}
                  className="px-md py-2 rounded-lg font-bold text-xs text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSubCategory}
                  className="px-lg py-2 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  Save Sub-Category
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title={deleteConfig.title}
          message={deleteConfig.message}
          confirmText="Delete"
          type="danger"
        />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LEVEL 3: PLANS VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (navigationLevel === 'plans') {
    const plansList = selectedSubCategory?.plans || [];
    const isParentRenewalEnabled = selectedSubCategory?.hasRenewal !== false;
    const filteredPlans = plansList.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return p.name?.toLowerCase().includes(q);
    });

    return (
      <div className="space-y-md md:space-y-lg pb-20 max-w-full overflow-x-hidden animate-in fade-in duration-300">
        <BreadcrumbNav />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md mb-lg">
          <div>
            <h1 className="text-2xl md:text-h1 font-bold text-on-surface">
              {selectedSubCategory?.name} — Plans
            </h1>
            <p className="text-on-surface-variant text-xs md:text-body-md">
              Manage plans and pricing structure under sub-category <strong className="text-primary">{selectedSubCategory?.name}</strong>.
            </p>
          </div>
          <button
            onClick={handleOpenAddPlan}
            className="w-full sm:w-auto bg-primary text-on-primary px-lg md:px-xl py-sm rounded-full font-bold flex items-center justify-center gap-sm hover:shadow-lg transition-all active:scale-95 cursor-pointer shadow-md flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Plan
          </button>
        </div>

        {/* Search */}
        <div className="mb-lg grow relative w-full sm:max-w-[500px] p-1">
          <span className="material-symbols-outlined absolute left-[18px] top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search plans..."
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-[44px] pr-md py-sm font-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {plansList.length === 0 ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 mb-md">
              view_list
            </span>
            <h3 className="font-h3 text-h3 text-on-surface mb-xs">No Plans Created</h3>
            <p className="font-body-md text-body-md text-on-surface-variant/70 mb-lg">
              Create the first plan for "{selectedSubCategory?.name}".
            </p>
            <button
              onClick={handleOpenAddPlan}
              className="bg-primary text-on-primary px-xl py-sm rounded-full font-bold inline-flex items-center gap-sm hover:shadow-lg transition-all cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Plan
            </button>
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low">
                    <th className={`py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase ${isParentRenewalEnabled ? 'w-1/4' : 'w-1/3'}`}>
                      Plan Name
                    </th>
                    <th className={`py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase ${isParentRenewalEnabled ? 'w-1/4' : 'w-1/3'}`}>
                      Selling Price
                    </th>
                    {isParentRenewalEnabled && (
                      <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase w-1/4">
                        Selling Renewal
                      </th>
                    )}
                    <th className={`py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase text-right ${isParentRenewalEnabled ? 'w-1/4' : 'w-1/3'}`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {filteredPlans.length === 0 ? (
                    <tr>
                      <td colSpan={isParentRenewalEnabled ? 4 : 3} className="py-lg text-center text-on-surface-variant font-body-md">
                        No matching plans found.
                      </td>
                    </tr>
                  ) : (
                    filteredPlans.map(plan => (
                      <tr key={plan.id} className="hover:bg-surface-container-low/35 transition-colors">
                        <td className="py-md px-gutter font-body-md text-on-surface font-bold text-base">
                          {plan.name}
                        </td>
                        <td className="py-md px-gutter font-body-md font-bold text-success">
                          ₹{plan.sellerPrice || 0}
                        </td>
                        {isParentRenewalEnabled && (
                          <td className="py-md px-gutter font-body-md text-on-surface font-semibold">
                            {plan.hasRenewal !== false ? `₹${plan.sellerPriceRenewal || 0}` : '—'}
                          </td>
                        )}
                        {/* <td className="py-md px-gutter font-body-md text-on-surface-variant">
                          ₹{plan.costPrice || 0}
                        </td>
                        <td className="py-md px-gutter font-body-md text-on-surface-variant">
                          {plan.hasRenewal !== false ? `₹${plan.costPriceRenewal || 0}` : '—'}
                        </td> */}
                        <td className="px-sm md:px-md py-md text-right">
                          <div className="flex items-center justify-end gap-sm">
                            <button
                              onClick={() => handleOpenEditPlan(plan)}
                              className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-secondary/10 rounded-lg transition-all cursor-pointer"
                              title="Edit Plan"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>

                            <button
                              onClick={() => {
                                setDeleteConfig({
                                  type: 'plan',
                                  item: plan,
                                  title: 'Delete Plan?',
                                  message: `Are you sure you want to delete plan "${plan.name}"?`,
                                });
                                setIsDeleteModalOpen(true);
                              }}
                              className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all cursor-pointer"
                              title="Delete Plan"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add / Edit Plan */}
        {isPlanModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-md animate-in fade-in duration-200">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[580px] shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-gutter py-md bg-surface-container-low border-b border-outline-variant">
                <h3 className="font-h3 text-h3 text-on-surface font-bold">
                  {planModalData.id ? 'Edit Plan' : 'Add Plan'}
                </h3>
                <button
                  onClick={() => setIsPlanModalOpen(false)}
                  className="p-xs text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors flex cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="p-gutter space-y-md">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Starter Plan, Professional Plan"
                    value={planModalData.name}
                    onChange={e => setPlanModalData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-md py-2.5 text-sm font-semibold text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    autoFocus
                  />
                </div>

                <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant/30 space-y-sm">
                  <div className="flex items-center justify-between mb-xs">
                    <span className="text-xs font-bold text-on-surface-variant uppercase">Plan Pricing</span>
                    {isParentRenewalEnabled && (
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-on-surface-variant select-none">
                        <input
                          type="checkbox"
                          checked={planModalData.hasRenewal}
                          onChange={e => setPlanModalData(prev => ({ ...prev, hasRenewal: e.target.checked }))}
                          className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                        Has Renewal Pricing
                      </label>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                    <PriceInput
                      label="Selling Price (₹)"
                      placeholder="0"
                      value={planModalData.sellerPrice}
                      onChange={val => setPlanModalData(prev => ({ ...prev, sellerPrice: val }))}
                    />
                    {isParentRenewalEnabled && planModalData.hasRenewal && (
                      <PriceInput
                        label="Selling Renewal Price (₹)"
                        placeholder="0"
                        value={planModalData.sellerPriceRenewal}
                        onChange={val => setPlanModalData(prev => ({ ...prev, sellerPriceRenewal: val }))}
                      />
                    )}
                    <PriceInput
                      label="Cost Price (₹) (Optional)"
                      placeholder="0"
                      value={planModalData.costPrice}
                      onChange={val => setPlanModalData(prev => ({ ...prev, costPrice: val }))}
                    />
                    {isParentRenewalEnabled && planModalData.hasRenewal && (
                      <PriceInput
                        label="Cost Renewal Price (₹) (Optional)"
                        placeholder="0"
                        value={planModalData.costPriceRenewal}
                        onChange={val => setPlanModalData(prev => ({ ...prev, costPriceRenewal: val }))}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="px-gutter py-md bg-surface-container-low border-t border-outline-variant flex justify-end gap-sm">
                <button
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-md py-2 rounded-lg font-bold text-xs text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePlan}
                  className="px-lg py-2 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  Save Plan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title={deleteConfig.title}
          message={deleteConfig.message}
          confirmText="Delete"
          type="danger"
        />
      </div>
    );
  }

  return null;
};

export default AddProduct;