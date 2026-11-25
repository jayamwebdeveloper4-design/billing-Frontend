import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { FolderPlus, X, Building, Tag, DollarSign, Plus } from "lucide-react";
import Button from "../../../UI/Components/Button";
import InputFeild from "../../../UI/Components/InputFeild";
import { useCreateProjectMutation } from "../../../Redux/Project";
import { useGetProductsQuery } from "../../../Redux/Product";

const initialForm = {
  ProjectName: "",
  serviceName: "",
  Budget: {
    currency: "₹",
    amount: "",
  },
};

export const Addproject = ({
  customerData,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onSuccess,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const [formData, setFormData] = useState(initialForm);
  const [createProjectMutation, { isLoading }] = useCreateProjectMutation();

  // Fetch product catalog via RTK Query
  const { data: rawCatalogProducts, isLoading: isCatalogLoading } = useGetProductsQuery(undefined, {
    skip: !isOpen,
  });

  const catalogProducts = useMemo(() => {
    if (Array.isArray(rawCatalogProducts)) return rawCatalogProducts;
    if (Array.isArray(rawCatalogProducts?.data)) return rawCatalogProducts.data;
    return [];
  }, [rawCatalogProducts]);

  // Customer's existing order services
  const customerServices = useMemo(() => {
    return [...(customerData?.orders || [])]
      .sort((a, b) => new Date(b.orderDate || 0).getTime() - new Date(a.orderDate || 0).getTime())
      .flatMap((order) => order.products || [])
      .map((product) => product.productName || product.product)
      .filter((serviceName, index, services) => serviceName && services.indexOf(serviceName) === index);
  }, [customerData]);

  // Catalog products and subcategories
  const catalogServices = useMemo(() => {
    const list = [];
    catalogProducts.forEach((cat) => {
      const catName = cat.name || "";
      if (Array.isArray(cat.subCategories) && cat.subCategories.length > 0) {
        cat.subCategories.forEach((sc) => {
          list.push({
            name: `${catName} - ${sc.name}`,
            price: sc.sellerPrice || sc.costPrice || 0,
          });
        });
      } else if (catName) {
        list.push({
          name: catName,
          price: 0,
        });
      }
    });
    return list;
  }, [catalogProducts]);

  const handleClose = () => {
    if (isLoading) return;
    if (isControlled) {
      if (controlledOnClose) controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const initFormData = () => {
    const latestOrder = [...(customerData?.orders || [])].sort(
      (a, b) => new Date(b.orderDate || 0).getTime() - new Date(a.orderDate || 0).getTime()
    )[0];
    const serviceName = (latestOrder?.products || [])
      .map((product) => product.productName || product.product)
      .filter(Boolean)
      .join(", ");
    const selectedService =
      (latestOrder?.products || [])
        .map((product) => product.productName || product.product)
        .find(Boolean) || "";
    const amount = latestOrder?.totalPrice;

    setFormData({
      ...initialForm,
      ProjectName: serviceName || "",
      serviceName: selectedService || "",
      Budget: {
        currency: "₹",
        amount:
          Number.isFinite(Number(amount)) && amount !== undefined
            ? String(amount)
            : "",
      },
    });
  };

  // Sync / populate on open
  useEffect(() => {
    if (isOpen) {
      initFormData();
    }
  }, [isOpen, customerData]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isLoading) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "amount") {
      setFormData((prev) => ({
        ...prev,
        Budget: { ...prev.Budget, amount: value },
      }));
      return;
    }
    if (name === "currency") {
      setFormData((prev) => ({
        ...prev,
        Budget: { ...prev.Budget, currency: value },
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!formData.ProjectName.trim() || !customerData?._id) {
      toast.error("Project Name and customer are required");
      return;
    }

    try {
      const payload = {
        ProjectName: formData.ProjectName.trim(),
        customerId: customerData._id,
        serviceName: formData.serviceName.trim() || undefined,
        ...(formData.Budget.amount !== "" && {
          Budget: {
            currency: formData.Budget.currency || "₹",
            amount: Number(formData.Budget.amount),
          },
        }),
      };

      await createProjectMutation(payload).unwrap();
      toast.success("Project created successfully!");
      setFormData(initialForm);
      if (onSuccess) onSuccess();
      handleClose();
    } catch (error) {
      const msg = error?.data?.message || error?.message || "Failed to create project";
      toast.error(msg);
    }
  };

  return (
    <>
      {!isControlled && (
        <Button
          onClick={() => setInternalIsOpen(true)}
          disabled={!customerData?._id}
          size="sm"
          variant="outline"
          icon={FolderPlus}
          className="font-bold border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          Add Project
        </Button>
      )}

      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 md:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isLoading) {
                handleClose();
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="bg-white border border-gray-200 rounded-2xl w-full max-w-[520px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <FolderPlus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Add Project</h2>
                    <p className="text-xs text-gray-500">
                      Create and assign a project tracker for this customer
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded-full text-gray-500 cursor-pointer transition-colors disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                {/* Customer Snapshot */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 tracking-wider uppercase select-none mb-1.5">
                    Customer
                  </label>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50/80 text-sm font-semibold text-gray-800">
                    <Building className="w-4 h-4 text-gray-500" />
                    <span>{customerData?.name || "Selected Customer"}</span>
                  </div>
                </div>

                {/* Project Name using InputFeild */}
                <InputFeild
                  label="Project Name"
                  required
                  name="ProjectName"
                  value={formData.ProjectName}
                  onChange={handleChange}
                  placeholder="e.g. Website Redesign / ERP System"
                  autoFocus
                />

                {/* Service Name select using InputFeild */}
                <InputFeild
                  as="select"
                  label="Associated Service"
                  name="serviceName"
                  value={formData.serviceName}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    handleChange(e);
                    const foundCatalog = catalogServices.find((s) => s.name === selectedVal);
                    if (foundCatalog && !formData.ProjectName) {
                      setFormData((prev) => ({
                        ...prev,
                        serviceName: selectedVal,
                        ProjectName: selectedVal,
                        ...(prev.Budget.amount === "" && foundCatalog.price > 0 && {
                          Budget: { ...prev.Budget, amount: String(foundCatalog.price) },
                        }),
                      }));
                    }
                  }}
                  hint={isCatalogLoading ? "Loading products..." : undefined}
                >
                  <option value="">Select a service (optional)</option>
                  {customerServices.length > 0 && (
                    <optgroup label="Customer Subscribed Services">
                      {customerServices.map((service, idx) => (
                        <option key={`cust-${idx}`} value={service}>
                          {service}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {catalogServices.length > 0 && (
                    <optgroup label="Catalog Products & Services">
                      {catalogServices.map((catService, idx) => (
                        <option key={`cat-${idx}`} value={catService.name}>
                          {catService.name} {catService.price > 0 ? `(₹${catService.price.toLocaleString()})` : ""}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </InputFeild>

                {/* Budget using InputFeild with currency prefix */}
                <InputFeild
                  label="Budget (Optional)"
                  type="number"
                  min="0"
                  name="amount"
                  value={formData.Budget.amount}
                  onChange={handleChange}
                  placeholder="e.g. 50000"
                  leftElement={
                    <select
                      name="currency"
                      value={formData.Budget.currency}
                      onChange={handleChange}
                      className="bg-transparent font-bold text-xs text-gray-700 outline-none pr-1.5 border-r border-gray-300 cursor-pointer py-1"
                    >
                      <option value="₹">₹ (INR)</option>
                      <option value="$">$ (USD)</option>
                    </select>
                  }
                />

                {/* Modal Footer Actions using local Button */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={isLoading}
                    icon={Plus}
                    className="font-semibold"
                  >
                    Add Project
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default Addproject;
