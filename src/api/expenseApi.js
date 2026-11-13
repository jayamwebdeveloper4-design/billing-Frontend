import api from "./api";

const pageSize = 50;

export const getExpenses = async ({
  cursor,
  category,
  startDate,
  endDate,
  month,
  signal,
} = {}) => {
  const params = { limit: pageSize };
  if (cursor) params.cursor = cursor;
  if (category) params.category = category;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (month) params.month = month;

  const { data } = await api.get("/expenses", { params, signal });
  return data;
};

export const createExpense = async ({ name, amount, category, date, receipt }) => {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("amount", amount);
  formData.append("category", category);
  formData.append("date", date);
  if (receipt) formData.append("receipt", receipt);

  const { data } = await api.post("/expenses", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.expense;
};

export const updateExpense = async (id, { name, amount, category, date, paymentStatus }) => {
  const { data } = await api.patch(`/expenses/${id}`, {
    name,
    amount,
    category,
    date,
    paymentStatus,
  });
  return data.expense;
};

export const getExpenseReceiptUrl = (receiptPath) => {
  const apiBase = new URL(api.defaults.baseURL, window.location.origin);
  const basePath = apiBase.pathname.replace(/\/+$/, "");
  const relativePath = receiptPath.replace(/^\/+/, "");
  return `${apiBase.origin}${basePath}/${relativePath}`;
};
