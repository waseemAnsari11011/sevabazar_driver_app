export const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) {
        return '₹0';
    }

    // Convert to number if it's a string
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    // Check if it's a valid number
    if (isNaN(numAmount)) {
        return '₹0';
    }

    // Round to nearest integer
    return `₹${Math.round(numAmount)}`;
};
