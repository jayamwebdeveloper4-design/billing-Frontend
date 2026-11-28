import React, { useState, useMemo } from 'react';
import {
  Folder,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  FolderTree,
  Layers,
  AlertCircle,
  X,
  Search,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Header from '../../UI/LayoutComponents/Header';
import Button from '../../UI/Components/Button';
import SearchBar from '../../UI/Components/SearchBar';
import Table from '../../UI/Components/Table';
import InputFeild from '../../UI/Components/InputFeild';
import SubCatagary from './Components/SubCatagary';
import Manageplan from './Components/Manageplan';
import {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from '../../Redux/Product';

export const Product = () => {
  // Navigation Hierarchy: 'categories' | 'subcategories' | 'plans'
  const [navigationLevel, setNavigationLevel] = useState('categories');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [categoryError, setCategoryError] = useState('');

  // Delete Category Confirmation State
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // RTK Query hooks
  const { data: rawProducts, isLoading, isFetching } = useGetProductsQuery();
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  const isSavingCategory = isCreating || isUpdating;

  // Normalized products list
  const products = useMemo(() => {
    if (Array.isArray(rawProducts)) return rawProducts;
    if (Array.isArray(rawProducts?.data)) return rawProducts.data;
    return [];
  }, [rawProducts]);

  // Current active category object
  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return products.find((p) => p._id === selectedCategoryId) || null;
  }, [products, selectedCategoryId]);

  // Current active sub-category object
  const selectedSubCategory = useMemo(() => {
    if (!selectedCategory || !selectedSubCategoryId) return null;
    return (
      selectedCategory.subCategories?.find(
        (sc) => (sc._id || sc.id) === selectedSubCategoryId
      ) || null
    );
  }, [selectedCategory, selectedSubCategoryId]);

  // Filter Categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter(
      (cat) =>
        cat.name?.toLowerCase().includes(q) ||
        cat.subCategories?.some(
          (sc) =>
            sc.name?.toLowerCase().includes(q) ||
            sc.plans?.some((p) => p.name?.toLowerCase().includes(q))
        )
    );
  }, [products, searchQuery]);

  // Open Add Category Modal
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryNameInput('');
    setCategoryError('');
    setIsCategoryModalOpen(true);
  };

  // Open Edit Category Modal
  const handleOpenEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryNameInput(cat.name || '');
    setCategoryError('');
    setIsCategoryModalOpen(true);
  };

  // Save Category (Add or Rename)
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryNameInput.trim()) {
      setCategoryError('Category name is required');
      return;
    }

    try {
      if (editingCategory) {
        await updateProduct({
          id: editingCategory._id,
          name: categoryNameInput.trim(),
        }).unwrap();
        toast.success('Category updated successfully!');
      } else {
        await createProduct({
          name: categoryNameInput.trim(),
          subCategories: [],
        }).unwrap();
        toast.success('Category created successfully!');
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryNameInput('');
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || err?.message || 'Failed to save category');
    }
  };

  // Confirm Delete Category
  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteProduct(categoryToDelete._id).unwrap();
      toast.success('Category deleted successfully!');
      setCategoryToDelete(null);
      if (selectedCategoryId === categoryToDelete._id) {
        setNavigationLevel('categories');
        setSelectedCategoryId(null);
        setSelectedSubCategoryId(null);
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || err?.message || 'Failed to delete category');
    }
  };

  // Drilldown Navigation Handlers
  const handleDrillToSubCategories = (category) => {
    setSelectedCategoryId(category._id);
    setSelectedSubCategoryId(null);
    setNavigationLevel('subcategories');
  };

  const handleDrillToPlans = (subCategory) => {
    setSelectedSubCategoryId(subCategory._id || subCategory.id);
    setNavigationLevel('plans');
  };

  // Breadcrumb Trail Component
  const Breadcrumbs = () => (
    <nav className="flex items-center gap-1.5 text-xs md:text-sm font-semibold text-gray-500 mb-4 flex-wrap">
      <button
        type="button"
        onClick={() => {
          setNavigationLevel('categories');
          setSelectedCategoryId(null);
          setSelectedSubCategoryId(null);
        }}
        className={`hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer ${
          navigationLevel === 'categories' ? 'text-blue-700 font-bold' : ''
        }`}
      >
        <Folder className="w-4 h-4 text-blue-600" />
        Categories Catalog
      </button>

      {(navigationLevel === 'subcategories' || navigationLevel === 'plans') && selectedCategory && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          <button
            type="button"
            onClick={() => {
              setNavigationLevel('subcategories');
              setSelectedSubCategoryId(null);
            }}
            className={`hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer ${
              navigationLevel === 'subcategories' ? 'text-blue-700 font-bold' : ''
            }`}
          >
            <FolderTree className="w-4 h-4 text-indigo-600" />
            {selectedCategory.name}
          </button>
        </>
      )}

      {navigationLevel === 'plans' && selectedSubCategory && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-blue-700 font-bold flex items-center gap-1">
            <Layers className="w-4 h-4 text-emerald-600" />
            {selectedSubCategory.name} (Plans)
          </span>
        </>
      )}
    </nav>
  );

  // Table Columns for Level 1: Categories
  const categoryColumns = [
    {
      key: 'name',
      label: 'Category Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
            <Folder className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm block">{row.name}</span>
            <span className="text-[11px] text-gray-500">Service Category</span>
          </div>
        </div>
      ),
    },
    {
      key: 'subCount',
      label: 'Sub-Categories',
      render: (row) => {
        const count = row.subCategories?.length || 0;
        return (
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-sm">{count}</span>
            <span className="text-xs text-gray-500">sub-types</span>
          </div>
        );
      },
    },
    {
      key: 'models',
      label: 'Configured Models',
      render: (row) => {
        const subs = row.subCategories || [];
        const planSubs = subs.filter((s) => s.hasPlan).length;
        const fixedSubs = subs.filter((s) => !s.hasPlan && !s.oneTimePayment).length;
        const oneTimeSubs = subs.filter((s) => s.oneTimePayment).length;

        if (subs.length === 0) {
          return <span className="text-xs text-gray-400 italic">No sub-types yet</span>;
        }

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {planSubs > 0 && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {planSubs} Tiered
              </span>
            )}
            {fixedSubs > 0 && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {fixedSubs} Fixed
              </span>
            )}
            {oneTimeSubs > 0 && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                {oneTimeSubs} One-Time
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            icon={FolderTree}
            onClick={() => handleDrillToSubCategories(row)}
            className="text-blue-700 hover:bg-blue-50 border-blue-200"
          >
            Manage Sub-Categories ({row.subCategories?.length || 0})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Pencil}
            onClick={() => handleOpenEditCategory(row)}
            className="text-gray-600 hover:text-blue-600"
          >
            Rename
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => setCategoryToDelete(row)}
            className="text-gray-500 hover:text-red-600"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-[1440px] mx-auto space-y-4">
      {/* Dynamic Breadcrumbs */}
      <Breadcrumbs />

      {/* LEVEL 1: CATEGORIES VIEW */}
      {navigationLevel === 'categories' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <Header
            title="Products & Services Catalog"
            subtitle="Organize product categories, sub-categories, and tiered pricing packages."
            action={
              <Button variant="primary" size="md" icon={Plus} onClick={handleOpenAddCategory}>
                Add Category
              </Button>
            }
          />

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search category, sub-category, or plan..."
              className="max-w-md w-full"
            />
            <div className="text-xs font-semibold text-gray-500 flex items-center gap-2 self-end sm:self-center">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
              <span>{products.length} Categories Registered</span>
            </div>
          </div>

          <Table
            columns={categoryColumns}
            data={filteredCategories}
            isLoading={isLoading || isFetching}
            emptyMessage={
              searchQuery
                ? 'No categories match your search.'
                : 'No product categories found. Click "Add Category" to get started.'
            }
            keyField="_id"
          />
        </div>
      )}

      {/* LEVEL 2: SUB-CATEGORIES VIEW */}
      {navigationLevel === 'subcategories' && selectedCategory && (
        <SubCatagary
          category={selectedCategory}
          onBack={() => setNavigationLevel('categories')}
          onManagePlans={handleDrillToPlans}
        />
      )}

      {/* LEVEL 3: PLANS VIEW */}
      {navigationLevel === 'plans' && selectedCategory && selectedSubCategory && (
        <Manageplan
          category={selectedCategory}
          subCategory={selectedSubCategory}
          onBack={() => setNavigationLevel('subcategories')}
        />
      )}

      {/* Add / Edit Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
          <div className="relative w-full max-w-[460px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {editingCategory ? 'Rename Category' : 'Create Category'}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">Top-level product group</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <InputFeild
                label="Category Name"
                required
                placeholder="e.g. Web Hosting, Domain Registration, SEO Services"
                value={categoryNameInput}
                onChange={(e) => {
                  setCategoryNameInput(e.target.value);
                  if (categoryError) setCategoryError('');
                }}
                error={categoryError}
                autoFocus
              />

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <Button variant="outline" size="md" onClick={() => setIsCategoryModalOpen(false)} disabled={isSavingCategory}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit" loading={isSavingCategory}>
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
          <div className="relative w-full max-w-[400px] bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Delete Category?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to delete <strong className="text-gray-800">{categoryToDelete.name}</strong> and all its sub-categories? This cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" size="md" onClick={() => setCategoryToDelete(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="danger" size="md" onClick={handleConfirmDeleteCategory} loading={isDeleting}>
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Product;

