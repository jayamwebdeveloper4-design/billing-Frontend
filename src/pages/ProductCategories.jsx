import React, { useState, useMemo, useEffect } from "react";
import ConfirmationModal from "../components/ConfirmationModal";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../api/categoryApi";
import toast from "react-hot-toast";

const ProductCategories = () => {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  
  const [searchQuery, setSearchQuery] = useState('')

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newCategory, setNewCategory] = useState({
    name: "",
    attributes: [{ name: "", values: [] }],
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      toast.error("Failed to fetch categories");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttribute = () => {
    setNewCategory({ ...newCategory, attributes: [...newCategory.attributes, { name: '', values: [] }] })
  }

  const handleRemoveAttribute = (index) => {
    const updated = newCategory.attributes.filter((_, i) => i !== index)
    setNewCategory({ ...newCategory, attributes: updated })
  }

  const handleAttributeNameChange = (index, value) => {
    const updated = [...newCategory.attributes]
    updated[index].name = value
    setNewCategory({ ...newCategory, attributes: updated })
  }

  const handleAddValue = (attrIndex, value) => {
    if (!value.trim()) return
    const updated = [...newCategory.attributes]
    if (!updated[attrIndex].values.includes(value)) {
      updated[attrIndex].values.push(value.trim())
    }
    setNewCategory({ ...newCategory, attributes: updated })
  }

  const handleRemoveValue = (attrIndex, valIndex) => {
    const updated = [...newCategory.attributes]
    updated[attrIndex].values = updated[attrIndex].values.filter((_, i) => i !== valIndex)
    setNewCategory({ ...newCategory, attributes: updated })
  }

  const handleEditClick = (category) => {
    setNewCategory({
      name: category.name,
      attributes: JSON.parse(JSON.stringify(category.attributes)), // Deep copy
    });
    setEditingId(category._id);
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleViewClick = (category) => {
    setSelectedCategory(category);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteCategory(categoryToDelete._id);
      setCategories(categories.filter((c) => c._id !== categoryToDelete._id));
      toast.success("Category deleted successfully");
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
    } catch (err) {
      toast.error("Failed to delete category");
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();

    // 1. Validate Category Name
    if (!newCategory.name.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    // 2. Filter out empty attributes
    const filteredAttributes = newCategory.attributes.filter(
      (a) => a.name.trim() !== "",
    );

    // 3. Check if at least one attribute exists
    if (filteredAttributes.length === 0) {
      toast.error("Please add at least one attribute name");
      return;
    }

    // 4. Validate that each attribute has at least one value
    const emptyValueAttr = filteredAttributes.find(
      (a) => !a.values || a.values.length === 0,
    );
    if (emptyValueAttr) {
      toast.error(`Please add at least one value for "${emptyValueAttr.name}"`);
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        const updated = await updateCategory(editingId, {
          name: newCategory.name,
          attributes: filteredAttributes,
        });
        setCategories(
          categories.map((c) => (c._id === editingId ? updated : c)),
        );
        toast.success("Category updated successfully");
      } else {
        const added = await createCategory({
          name: newCategory.name,
          attributes: filteredAttributes,
        });
        setCategories([...categories, added]);
        toast.success("Category created successfully");
      }
      closeForm();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(category => {
      return category.name.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }, [categories, searchQuery])

  const closeForm = () => {
    setIsFormOpen(false)
    setIsEditing(false)
    setEditingId(null)
    setNewCategory({ name: '', attributes: [{ name: '', values: [] }] })
  }

  if (isFormOpen) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-md mb-lg md:mb-xl">
          <button 
            onClick={closeForm}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[20px] md:text-[24px]">arrow_back</span>
          </button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-h1 font-bold text-on-surface truncate">
              {isEditing ? 'Edit Category' : 'Add New Category'}
            </h1>
            <p className="text-on-surface-variant text-xs md:text-body-md truncate">
              {isEditing ? `Modifying settings for ${newCategory.name}.` : 'Define a new category and attributes.'}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSaveCategory}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md md:p-xl space-y-md md:space-y-xl shadow-sm"
        >
          {/* Category Name */}
          <div className="space-y-sm">
            <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="cat-name">
              Category Name <span className="text-error">*</span>
            </label>
            <input 
              required
              id="cat-name"
              type="text"
              placeholder="e.g. Footwear, Kitchenware"
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-md focus:ring-2 focus:ring-primary outline-none transition-all"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
            />
          </div>

          {/* Attributes List */}
          <div className="space-y-md md:space-y-lg">
            <div className="flex justify-between items-center">
              <label className="text-[10px] md:text-label-caps font-bold text-on-surface-variant uppercase tracking-widest">Attributes</label>
              <button 
                type="button"
                onClick={handleAddAttribute}
                className="text-primary font-bold text-[11px] md:text-body-sm flex items-center gap-xs hover:underline cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add Attribute
              </button>
            </div>
            
            <div className="space-y-lg">
              {newCategory.attributes.map((attr, index) => (
                <div key={index} className="bg-surface-container-low/50 border border-outline-variant rounded-xl p-md md:p-lg space-y-md animate-in fade-in slide-in-from-left-2 duration-300">
                  <div className="flex gap-sm">
                    <div className="grow space-y-sm">
                      <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                        Attribute Name <span className="text-error">*</span>
                      </label>
                      <input 
                        required
                        type="text"
                        placeholder="e.g. Size"
                        className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-2 md:py-sm font-body-md focus:ring-2 focus:ring-primary outline-none text-sm md:text-body-md"
                        value={attr.name}
                        onChange={(e) => handleAttributeNameChange(index, e.target.value)}
                      />
                    </div>
                    {newCategory.attributes.length > 1 && (
                      <div className="pt-5 md:pt-6">
                        <button 
                          type="button"
                          onClick={() => handleRemoveAttribute(index)}
                          className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[20px] md:text-[24px]">delete</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-sm">
                    <label className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                      Values <span className="text-error">*</span>
                    </label>
                    <div className="flex flex-wrap gap-sm min-h-[40px] p-2 bg-surface-container-lowest border border-outline-variant rounded-lg">
                      {attr.values.map((val, vIdx) => (
                        <div key={vIdx} className="bg-on-background/5 border border-outline-variant px-2 py-0.5 rounded-md flex items-center gap-xs animate-in zoom-in-95 duration-200">
                          <span className="text-[11px] md:text-body-sm font-bold text-on-surface">
                            {val.includes('|') ? val.split('|')[0] : val}
                          </span>
                          <button 
                            type="button"
                            onClick={() => handleRemoveValue(index, vIdx)}
                            className="material-symbols-outlined text-[12px] md:text-[14px] hover:text-error cursor-pointer"
                          >
                            close
                          </button>
                        </div>
                      ))}
                      <input 
                        type="text"
                        placeholder="Type & press Enter"
                        className="bg-transparent outline-none text-[11px] md:text-body-sm font-medium grow min-w-[120px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddValue(index, e.currentTarget.value)
                            e.currentTarget.value = ''
                          }
                        }}
                      />
                    </div>
                    <p className="text-[9px] md:text-[10px] text-on-surface-variant italic">Add values like Small, Blue|#0000ff. Press Enter to add.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-lg md:pt-xl border-t border-outline-variant flex flex-col sm:flex-row gap-md">
            <button
              disabled={loading}
              type="submit"
              className="order-1 sm:order-2 grow bg-primary text-on-primary font-bold py-3 md:py-md rounded-lg hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-sm shadow-sm disabled:opacity-80 disabled:cursor-not-allowed text-sm md:text-body-md"
            >
              {loading ? (
                <div className="flex items-center gap-sm">
                  <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                <>
                  <span className="material-symbols-outlined">
                    {isEditing ? "update" : "check_circle"}
                  </span>
                  {isEditing ? "Update Category" : "Save Category"}
                </>
              )}
            </button>
            <button 
              type="button"
              onClick={closeForm}
              className="order-2 sm:order-1 px-xl py-3 md:py-md font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all text-sm md:text-body-md"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md mb-lg md:mb-xl">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-h1 font-bold text-on-surface truncate">Categories</h1>
         
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="w-full md:w-auto bg-primary text-on-primary px-lg py-sm rounded-lg font-bold flex items-center justify-center gap-sm transition-all hover:bg-primary-container active:scale-95 shadow-sm text-sm"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          Add Category
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-md mb-lg max-w-[500px] px-0.5">
        <div className="grow relative">
          <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] ml-0.5">search</span>
          <input 
            type="text"
            placeholder="Search categories..."
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-[44px] pr-md py-sm font-body-md focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[600px] lg:min-w-full table-auto">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              <th className="px-sm md:px-md py-md font-label-caps text-[10px] md:text-label-caps text-on-surface-variant uppercase tracking-widest">Category</th>
              <th className="px-sm md:px-md py-md font-label-caps text-[10px] md:text-label-caps text-on-surface-variant uppercase tracking-widest">Attributes</th>
              <th className="px-sm md:px-md py-md font-label-caps text-[10px] md:text-label-caps text-on-surface-variant uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {loading && filteredCategories.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-xl py-20 text-center">
                  <div className="flex flex-col items-center gap-sm">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-on-surface-variant font-body-md">
                      Loading categories...
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCategories.map((category) => (
                <tr
                  key={category._id}
                  className="hover:bg-surface-container-low transition-colors group"
                >
                  <td className="px-sm md:px-md py-3 md:py-md">
                    <div className="flex items-center gap-md">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-[18px] md:text-[20px]">
                          category
                        </span>
                      </div>
                      <span className="text-sm md:text-body-md font-bold text-on-surface truncate">
                        {category.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-sm md:px-md py-md">
                    <div className="flex flex-wrap gap-sm max-w-[500px]">
                      {category.attributes.map((attr, idx) => (
                        <div
                          key={idx}
                          className="bg-surface-container-high px-sm py-xs rounded border border-outline-variant flex flex-col gap-0"
                        >
                          <span className="text-[10px] font-black text-primary uppercase leading-tight">
                            {attr.name}
                          </span>
                          <span className="text-body-sm text-on-surface-variant leading-tight truncate max-w-[120px]">
                            {attr.values?.join(", ") || "No values"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-sm md:px-md py-3 md:py-md text-right">
                    <div className="flex justify-end gap-1 md:gap-sm">
                      <button
                        onClick={() => handleViewClick(category)}
                        className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all cursor-pointer"
                        title="View Details"
                      >
                        <span className="material-symbols-outlined text-[18px] md:text-[20px]">visibility</span>
                      </button>
                      <button
                        onClick={() => handleEditClick(category)}
                        className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all cursor-pointer"
                        title="Edit Category"
                      >
                        <span className="material-symbols-outlined text-[18px] md:text-[20px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(category)}
                        className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all cursor-pointer"
                        title="Delete Category"
                      >
                        <span className="material-symbols-outlined text-[18px] md:text-[20px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Quick View Modal */}
      {isViewModalOpen && selectedCategory && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-md bg-on-background/20 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[420px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative max-h-[90vh] flex flex-col">      
            <div className="p-md md:p-lg space-y-md">
              <div className="flex items-center gap-md text-on-surface">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px] md:text-[28px]">
                    category
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg md:text-h3 font-black tracking-tight truncate">{selectedCategory.name}</h3>
                  <p className="text-on-surface-variant text-[10px] md:text-body-sm lowercase">Quick Overview</p>
                </div>
              </div>

              <div className="space-y-lg py-sm max-h-[400px] overflow-y-auto pr-xs">
                <div className="grid grid-cols-1 gap-md">
                  {selectedCategory.attributes.map((attr, idx) => (
                    <div key={idx} className="p-md bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-2">
                      <div className="flex items-center gap-sm">
                        <span className="material-symbols-outlined text-primary text-[18px]">settings_input_component</span>
                        <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{attr.name}</p>
                      </div>
                      <div className="flex flex-wrap gap-xs">
                        {attr.values?.map((val, vIdx) => (
                          <span key={vIdx} className="bg-surface-container-lowest border border-outline-variant px-sm py-0.5 rounded text-[11px] font-bold text-on-surface">
                            {val.includes('|') ? val.split('|')[0] : val}
                          </span>
                        )) || <span className="text-body-sm text-on-surface-variant italic">No values defined</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedCategory.attributes.length === 0 && (
                  <div className="p-xl text-center space-y-sm">
                    <span className="material-symbols-outlined text-outline text-[40px]">inventory_2</span>
                    <p className="text-on-surface-variant text-body-sm italic">No specific attributes defined for this category.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-surface-container-low px-md md:px-lg py-sm flex justify-end border-t border-outline-variant/30 mt-auto">
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="w-full sm:w-auto px-xl py-2 md:py-sm bg-primary text-on-primary font-bold rounded-lg transition-all active:scale-[0.98] text-[12px] md:text-body-sm shadow-sm hover:shadow-md hover:brightness-110 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Category?"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />

      {filteredCategories.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-md">
            <span className="material-symbols-outlined text-outline text-3xl">search_off</span>
          </div>
          <h3 className="text-h3 font-h3 text-on-surface">No categories found</h3>
          <p className="text-on-surface-variant font-body-md max-w-[300px]">
            Try adjusting your search or filters to find what you're looking for.
          </p>
          <button 
            onClick={() => setSearchQuery('')}
            className="mt-lg text-primary font-bold hover:underline cursor-pointer"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  )
}

export default ProductCategories
