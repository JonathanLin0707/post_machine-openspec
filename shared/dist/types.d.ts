export interface Product {
    id: string;
    name: string;
    price: number;
    barcode?: string;
    category?: string;
    stock: number;
    imageUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface OrderItem {
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}
export interface Order {
    id: string;
    total: number;
    tax: number;
    paymentMethod: 'cash' | 'credit_card' | 'mobile_payment';
    status: 'completed' | 'pending' | 'cancelled';
    createdAt: Date;
    items: OrderItem[];
}
export interface CartItem {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
}
export interface DailyReport {
    date: string;
    orderCount: number;
    totalSales: number;
    averageOrderValue: number;
}
export interface MonthlyReport {
    month: string;
    year: number;
    totalSales: number;
    orderCount: number;
}
export interface DailyReportResponse {
    today?: {
        orderCount?: number;
        totalSales?: number;
        averageOrderValue?: number;
    };
    chart: DailyReport[];
}
export interface TopProduct {
    productId: string;
    name: string;
    quantitySold: number;
    revenue: number;
}
