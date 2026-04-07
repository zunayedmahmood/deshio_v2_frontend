<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Expense;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductBatch;
use App\Models\ProductReturn;
use App\Models\Refund;
use App\Models\Store;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BusinessAnalyticsController extends Controller
{
    public function commandCenter(Request $request)
    {
        [$from, $to] = $this->resolveDateRange($request);
        $storeId = $request->query('store_id');

        $orders = $this->baseOrdersQuery($from, $to, $storeId)->with(['items.product.category', 'customer', 'store'])->get();
        $returns = $this->baseReturnsQuery($from, $to, $storeId)->get();
        $refunds = $this->baseRefundsQuery($from, $to, $storeId)->get();
        $expenses = $this->baseExpensesQuery($from, $to, $storeId)->get();
        $inventoryBatches = $this->baseInventoryQuery($storeId)->with(['product', 'store'])->get();

        $orderItems = $orders->flatMap->items;
        $salesTrend = $this->buildSalesTrend($orders, $from, $to);
        $topProducts = $this->buildTopProducts($orderItems, $inventoryBatches);
        $stockWatchlist = $this->buildStockWatchlist($inventoryBatches, $orderItems);
        $branchPerformance = $this->buildBranchPerformance($orders, $expenses);

        $kpis = [
            'total_orders' => $orders->count(),
            'total_units' => (int) $orderItems->sum('quantity'),
            'gross_sales' => round((float) $orders->sum('subtotal'), 2),
            'net_sales' => round((float) $orders->sum('total_amount'), 2),
            'total_discount' => round((float) $orders->sum('discount_amount'), 2),
            'avg_order_value' => round((float) ($orders->count() ? $orders->avg('total_amount') : 0), 2),
            'gross_profit' => round((float) ($orderItems->sum('total_amount') - $orderItems->sum('cogs')), 2),
            'margin_pct' => round((float) (($orderItems->sum('total_amount') > 0) ? (($orderItems->sum('total_amount') - $orderItems->sum('cogs')) / $orderItems->sum('total_amount')) * 100 : 0), 2),
            'return_count' => $returns->count(),
            'refund_amount' => round((float) $refunds->sum('refund_amount'), 2),
            'inventory_value' => round((float) $inventoryBatches->sum(fn ($b) => ((float) $b->cost_price) * ((int) $b->quantity)), 2),
            'low_stock_count' => $inventoryBatches->filter(fn ($b) => (int) $b->quantity > 0 && (int) $b->quantity <= 5)->count(),
            'out_of_stock_count' => $inventoryBatches->filter(fn ($b) => (int) $b->quantity <= 0)->count(),
            'repeat_customers' => $orders->pluck('customer_id')->filter()->countBy()->filter(fn ($count) => $count > 1)->count(),
            'repeat_customer_rate' => round((float) ($orders->pluck('customer_id')->filter()->count() ? ($orders->pluck('customer_id')->filter()->countBy()->filter(fn ($count) => $count > 1)->count() / $orders->pluck('customer_id')->filter()->unique()->count()) * 100 : 0), 2),
        ];

        $categoryPerformance = $orderItems
            ->groupBy(fn ($item) => $item->product?->category_id ?? 'uncategorized')
            ->map(function (Collection $items, $categoryId) {
                $name = optional(optional($items->first())->product)->category->name ?? ($categoryId === 'uncategorized' ? 'Uncategorized' : 'Category ' . $categoryId);
                return ['label' => $name, 'value' => round((float) $items->sum('total_amount'), 2)];
            })
            ->sortByDesc('value')
            ->values()
            ->take(8)
            ->values();

        $paymentMethodMix = $orders
            ->groupBy(fn ($order) => $order->payment_method ?: 'unknown')
            ->map(fn ($group, $label) => ['label' => (string) $label, 'value' => round((float) $group->sum('total_amount'), 2)])
            ->sortByDesc('value')
            ->values();

        $statusMix = $orders
            ->groupBy(fn ($order) => $order->status ?: 'unknown')
            ->map(fn ($group, $label) => ['label' => (string) $label, 'value' => $group->count()])
            ->values();

        $paymentStatusMix = $orders
            ->groupBy(fn ($order) => $order->payment_status ?: 'unknown')
            ->map(fn ($group, $label) => ['label' => (string) $label, 'value' => $group->count()])
            ->values();

        $orderTypeMix = $orders
            ->groupBy(fn ($order) => $order->order_type ?: 'unknown')
            ->map(fn ($group, $label) => ['label' => (string) $label, 'value' => $group->count()])
            ->values();

        $todayHourly = collect(range(0, 23))->map(function ($hour) use ($orders) {
            $count = $orders->filter(function ($order) use ($hour) {
                return optional($order->order_date)->isToday() && optional($order->order_date)->hour === $hour;
            })->count();
            return ['label' => str_pad((string) $hour, 2, '0', STR_PAD_LEFT) . ':00', 'value' => $count];
        });

        $insights = $this->buildInsights($kpis, $topProducts, $stockWatchlist, $branchPerformance, $returns, $refunds);

        return response()->json([
            'success' => true,
            'data' => [
                'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
                'kpis' => $kpis,
                'sales_trend' => $salesTrend,
                'order_type_mix' => $orderTypeMix,
                'payment_status_mix' => $paymentStatusMix,
                'status_mix' => $statusMix,
                'category_performance' => $categoryPerformance,
                'payment_method_mix' => $paymentMethodMix,
                'top_products' => $topProducts,
                'stock_watchlist' => $stockWatchlist,
                'branch_performance' => $branchPerformance,
                'today_hourly_orders' => $todayHourly,
                'insights' => $insights,
            ],
        ]);
    }

    public function liveBestSellers(Request $request)
    {
        $from = Carbon::today();
        $to = Carbon::now();
        $storeId = $request->query('store_id');
        $orders = $this->baseOrdersQuery($from, $to, $storeId)->with('items.product')->get();
        $inventoryBatches = $this->baseInventoryQuery($storeId)->get();
        $items = $orders->flatMap->items;

        return response()->json([
            'success' => true,
            'data' => $this->buildTopProducts($items, $inventoryBatches)->take(8)->values(),
        ]);
    }

    public function branchComparison(Request $request)
    {
        [$from, $to] = $this->resolveDateRange($request);
        $storeId = $request->query('store_id');
        $orders = $this->baseOrdersQuery($from, $to, $storeId)->with('items')->get();
        $expenses = $this->baseExpensesQuery($from, $to, $storeId)->get();

        return response()->json([
            'success' => true,
            'data' => $this->buildBranchPerformance($orders, $expenses),
        ]);
    }

    public function exportSummary(Request $request): StreamedResponse
    {
        $payload = $this->commandCenter($request)->getData(true);
        $data = $payload['data'];
        $filename = 'command-center-' . now()->format('Ymd_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename={$filename}",
        ];

        return response()->stream(function () use ($data) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Metric', 'Value']);
            foreach ($data['kpis'] as $key => $value) {
                fputcsv($out, [$key, $value]);
            }
            fputcsv($out, []);
            fputcsv($out, ['Top Products']);
            fputcsv($out, ['Name', 'SKU', 'Units', 'Revenue', 'Gross Profit', 'Stock On Hand']);
            foreach ($data['top_products'] as $row) {
                fputcsv($out, [$row['name'], $row['sku'], $row['units'], $row['revenue'], $row['gross_profit'], $row['stock_on_hand']]);
            }
            fclose($out);
        }, 200, $headers);
    }

    private function resolveDateRange(Request $request): array
    {
        $from = $request->query('from') ? Carbon::parse($request->query('from'))->startOfDay() : now()->subDays(29)->startOfDay();
        $to = $request->query('to') ? Carbon::parse($request->query('to'))->endOfDay() : now()->endOfDay();
        return [$from, $to];
    }

    private function baseOrdersQuery(Carbon $from, Carbon $to, $storeId = null)
    {
        $query = Order::query()->whereBetween('order_date', [$from, $to]);
        if ($storeId) {
            $query->where('store_id', $storeId);
        }
        return $query;
    }

    private function baseReturnsQuery(Carbon $from, Carbon $to, $storeId = null)
    {
        $query = ProductReturn::query()->whereBetween('return_date', [$from->toDateString(), $to->toDateString()]);
        if ($storeId) {
            $query->where('store_id', $storeId);
        }
        return $query;
    }

    private function baseRefundsQuery(Carbon $from, Carbon $to, $storeId = null)
    {
        $query = Refund::query()->whereBetween('created_at', [$from, $to]);
        if ($storeId) {
            $query->whereHas('order', fn ($q) => $q->where('store_id', $storeId));
        }
        return $query;
    }

    private function baseExpensesQuery(Carbon $from, Carbon $to, $storeId = null)
    {
        $query = Expense::query()->whereBetween('expense_date', [$from->toDateString(), $to->toDateString()]);
        if ($storeId) {
            $query->where('store_id', $storeId);
        }
        return $query;
    }

    private function baseInventoryQuery($storeId = null)
    {
        $query = ProductBatch::query()->with('product.category');
        if ($storeId) {
            $query->where('store_id', $storeId);
        }
        return $query;
    }

    private function buildSalesTrend(Collection $orders, Carbon $from, Carbon $to): Collection
    {
        return collect($from->copy()->startOfDay()->daysUntil($to->copy()->startOfDay()->addDay()))
            ->map(function (Carbon $date) use ($orders) {
                $dayOrders = $orders->filter(fn ($o) => optional($o->order_date)->isSameDay($date));
                $items = $dayOrders->flatMap->items;
                $netSales = (float) $dayOrders->sum('total_amount');
                $profit = (float) ($items->sum('total_amount') - $items->sum('cogs'));

                return [
                    'date' => $date->toDateString(),
                    'orders' => $dayOrders->count(),
                    'net_sales' => round($netSales, 2),
                    'gross_profit' => round($profit, 2),
                ];
            })
            ->values();
    }

    private function buildTopProducts(Collection $items, Collection $inventoryBatches): Collection
    {
        $stockByProduct = $inventoryBatches->groupBy('product_id')->map(fn ($rows) => (int) $rows->sum('quantity'));

        return $items
            ->groupBy('product_id')
            ->map(function (Collection $productItems, $productId) use ($stockByProduct) {
                $first = $productItems->first();
                return [
                    'product_id' => (int) $productId,
                    'name' => (string) ($first->product_name ?: optional($first->product)->name ?: 'Unknown Product'),
                    'sku' => (string) ($first->product_sku ?: optional($first->product)->sku ?: ''),
                    'units' => (int) $productItems->sum('quantity'),
                    'revenue' => round((float) $productItems->sum('total_amount'), 2),
                    'gross_profit' => round((float) ($productItems->sum('total_amount') - $productItems->sum('cogs')), 2),
                    'stock_on_hand' => (int) ($stockByProduct[$productId] ?? 0),
                ];
            })
            ->sortByDesc('units')
            ->take(10)
            ->values();
    }

    private function buildStockWatchlist(Collection $inventoryBatches, Collection $items): Collection
    {
        $revenue30ByProduct = $items->groupBy('product_id')->map(fn ($rows) => round((float) $rows->sum('total_amount'), 2));

        return $inventoryBatches
            ->groupBy('product_id')
            ->map(function (Collection $batches, $productId) use ($revenue30ByProduct) {
                $first = $batches->first();
                $available = (int) $batches->sum('quantity');
                $reorder = max(5, (int) ceil($batches->avg('quantity') ?: 5));
                return [
                    'product_id' => (int) $productId,
                    'name' => (string) optional($first->product)->name,
                    'sku' => (string) optional($first->product)->sku,
                    'available_quantity' => $available,
                    'reorder_level' => $reorder,
                    'shortage' => max(0, $reorder - $available),
                    'revenue_30d' => (float) ($revenue30ByProduct[$productId] ?? 0),
                ];
            })
            ->filter(fn ($row) => $row['available_quantity'] <= $row['reorder_level'])
            ->sortByDesc('revenue_30d')
            ->take(8)
            ->values();
    }

    private function buildBranchPerformance(Collection $orders, Collection $expenses): Collection
    {
        $stores = Store::query()->select(['id', 'name'])->get()->keyBy('id');
        $expenseByStore = $expenses->groupBy('store_id')->map(fn ($rows) => (float) $rows->sum('total_amount'));

        return $orders
            ->groupBy('store_id')
            ->map(function (Collection $storeOrders, $storeId) use ($stores, $expenseByStore) {
                $items = $storeOrders->flatMap->items;
                $sales = (float) $storeOrders->sum('total_amount');
                $profitBeforeExpense = (float) ($items->sum('total_amount') - $items->sum('cogs'));
                $netProfit = $profitBeforeExpense - (float) ($expenseByStore[$storeId] ?? 0);
                return [
                    'store_id' => (int) $storeId,
                    'store_name' => (string) ($stores[$storeId]->name ?? ('Store ' . $storeId)),
                    'orders' => $storeOrders->count(),
                    'net_sales' => round($sales, 2),
                    'profit' => round($netProfit, 2),
                    'margin_pct' => round((float) ($sales > 0 ? ($netProfit / $sales) * 100 : 0), 2),
                ];
            })
            ->sortByDesc('net_sales')
            ->values();
    }

    private function buildInsights(array $kpis, Collection $topProducts, Collection $stockWatchlist, Collection $branchPerformance, Collection $returns, Collection $refunds): array
    {
        $insights = [];

        if ($topProducts->isNotEmpty()) {
            $leader = $topProducts->first();
            $insights[] = $leader['name'] . ' is the current hero SKU with ' . $leader['units'] . ' units sold and revenue of ' . round($leader['revenue']) . '.';
        }

        if ($stockWatchlist->isNotEmpty()) {
            $risk = $stockWatchlist->first();
            $insights[] = $risk['name'] . ' is under reorder pressure. Only ' . $risk['available_quantity'] . ' units remain against a reorder mark of ' . $risk['reorder_level'] . '.';
        }

        if ($branchPerformance->isNotEmpty()) {
            $best = $branchPerformance->sortByDesc('net_sales')->first();
            $insights[] = $best['store_name'] . ' is leading branch performance with net sales of ' . round($best['net_sales']) . ' and margin of ' . round($best['margin_pct'], 1) . '%.';
        }

        if ($kpis['repeat_customer_rate'] > 0) {
            $insights[] = 'Repeat customer rate stands at ' . round($kpis['repeat_customer_rate'], 1) . '%, showing how much of revenue is coming from retained buyers.';
        }

        if ($returns->count() > 0 || $refunds->sum('refund_amount') > 0) {
            $insights[] = 'Returns and refunds need attention: ' . $returns->count() . ' return cases and refund amount of ' . round($refunds->sum('refund_amount')) . ' during this period.';
        }

        return array_slice($insights, 0, 5);
    }
}
