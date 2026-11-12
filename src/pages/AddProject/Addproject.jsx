import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { createProject } from "../../api/projectapi";

const initialForm = {
    ProjectName: "",
    serviceName: "",
    Budget: {
        currency: "₹",
        amount: "",
    },
};

const Addproject = ({ customerData }) => {
    const [formData, setFormData] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const serviceOptions = [...(customerData?.orders || [])]
        .sort((a, b) => new Date(b.orderDate || 0).getTime() - new Date(a.orderDate || 0).getTime())
        .flatMap((order) => order.products || [])
        .map((product) => product.productName || product.product)
        .filter((serviceName, index, services) => serviceName && services.indexOf(serviceName) === index);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !loading) {
                setIsOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, loading]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "amount") {
            setFormData((prev) => ({
                ...prev,
                Budget: {
                    ...prev.Budget,
                    amount: value,
                },
            }));
            return;
        }

        if (name === "currency") {
            setFormData((prev) => ({
                ...prev,
                Budget: {
                    ...prev.Budget,
                    currency: value,
                },
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

        if (!formData.ProjectName || !customerData?._id) {
            toast.error("Project Name and customer are required");
            return;
        }

        setLoading(true);

        try {
            const payload = {
                ProjectName: formData.ProjectName,
                customerId: customerData._id,
                serviceName: formData.serviceName,
                ...(formData.Budget.amount !== "" && {
                    Budget: {
                        currency: formData.Budget.currency || "₹",
                        amount: Number(formData.Budget.amount),
                    },
                }),
            };

            const response = await createProject(payload);
            toast.success("Project created successfully");
            console.log("Project created:", response);
            setFormData(initialForm);
            setIsOpen(false);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to create project");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpen = () => {
        const latestOrder = [...(customerData?.orders || [])].sort(
            (a, b) => new Date(b.orderDate || 0).getTime() - new Date(a.orderDate || 0).getTime()
        )[0];
        const serviceName = (latestOrder?.products || [])
            .map((product) => product.productName || product.product)
            .filter(Boolean)
            .join(", ");
        const selectedService = (latestOrder?.products || [])
            .map((product) => product.productName || product.product)
            .find(Boolean) || "";
        const amount = latestOrder?.totalPrice;

        setFormData({
            ...initialForm,
            ProjectName: serviceName,
            serviceName: selectedService,
            Budget: {
                currency: "₹",
                amount: Number.isFinite(Number(amount)) && amount !== undefined ? String(amount) : "",
            },
        });
        setIsOpen(true);
    };

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                disabled={!customerData?._id}
                className="flex items-center gap-xs rounded-lg bg-primary px-md py-2 font-bold text-on-primary shadow-sm transition hover:brightness-105 active:scale-[0.98]"
            >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add Project
            </button>

            {isOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9999] grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !loading) {
                            setIsOpen(false);
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-project-title"
                        className="flex flex-col overflow-hidden rounded-2xl border border-outline-variant bg-white text-on-surface shadow-2xl"
                        style={{
                            boxSizing: "border-box",
                            width: "min(32rem, calc(100vw - 2rem))",
                            maxHeight: "calc(100vh - 2rem)",
                            backgroundColor: "#ffffff",
                        }}
                    >
                        <div className="flex items-start justify-between border-b border-outline-variant px-6 py-5">
                            <div>
                                <h2 id="add-project-title" className="text-xl font-bold text-on-surface">
                                    Add Project
                                </h2>
                                <p className="mt-1 text-sm text-on-surface-variant">
                                    Enter the project details below.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                disabled={loading}
                                aria-label="Close dialog"
                                className="rounded-lg p-2 text-on-surface-variant transition hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="min-h-0 space-y-5 overflow-y-auto p-6"
                        >
                            <div>
                                <label htmlFor="project-name" className="mb-2 block text-sm font-medium text-on-surface">
                                    Project Name
                                </label>
                                <input
                                    id="project-name"
                                    type="text"
                                    name="ProjectName"
                                    value={formData.ProjectName}
                                    onChange={handleChange}
                                    placeholder="Enter project name"
                                    className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-on-surface">
                                    Customer
                                </label>
                                <div className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-sm text-on-surface">
                                    {customerData?.name || "Selected customer"}
                                </div>
                            </div>

                            <div> 
                                <label htmlFor="service-name" className="mb-2 block text-sm font-medium text-on-surface">
                                    Service Name
                                </label>
                                <select
                                    id="service-name"
                                    name="serviceName"
                                    value={formData.serviceName}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="">Select a service</option>
                                    {serviceOptions.map((serviceName) => (
                                        <option key={serviceName} value={serviceName}>
                                            {serviceName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="budget-amount" className="mb-2 block text-sm font-medium text-on-surface">
                                    Budget
                                </label>
                                <div className="flex gap-3">
                                    <select
                                        name="currency"
                                        aria-label="Budget currency"
                                        value={formData.Budget.currency}
                                        onChange={handleChange}
                                        className="w-24 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="₹">₹</option>
                                        <option value="$">$</option>
                                    </select>
                                    <input
                                        id="budget-amount"
                                        type="number"
                                        min="0"
                                        name="amount"
                                        value={formData.Budget.amount}
                                        onChange={handleChange}
                                        placeholder="Enter amount"
                                        className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 border-t border-outline-variant pt-5">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    disabled={loading}
                                    className="rounded-lg border border-outline-variant px-4 py-2.5 font-medium text-on-surface transition hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="rounded-lg bg-primary px-5 py-2.5 font-bold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loading ? "Creating..." : "Add Project"}
                                </button>
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