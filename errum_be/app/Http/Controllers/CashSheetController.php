<?php

namespace App\Http\Controllers;

use App\Models\BranchCostEntry;
use App\Models\AdminEntry;
use App\Models\OwnerEntry;
use App\Models\Store;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * CashSheetController
 *
 * GET  /api/cash-sheet               → full monthly sheet
 * GET  /api/cash-sheet/entries       → raw entries for a date (detail panel)
 * POST /api/cash-sheet/branch-cost   → branch manager adds a cost entry
 * DELETE /api/cash-sheet/branch-cost/{id}
 * POST /api/cash-sheet/admin         → admin: salary_setaside | cash_to_bank | sslzc | pathao
 * DELETE /api/cash-sheet/admin/{id}
 * POST /api/cash-sheet/owner         → owner: cash_invest | bank_invest | cash_cost | bank_cost
 * DELETE /api/cash-sheet/owner/{id}
 *
 * ── Displayed cash / bank per branch ────────────────────────────────────────
 *   raw_cash      = order_payments cash methods (counter orders)
 *   raw_bank      = order_payments bank/card/mfs (counter orders)
 *   salary        = SUM admin_entries salary_setaside for this store+date
 *   cash_to_bank  = SUM admin_entries cash_to_bank for this store+date
 *   displayed_cash = raw_cash − salary − cash_to_bank
 *   displayed_bank = raw_bank + cash_to_bank
 *
 * ── Grand totals ─────────────────────────────────────────────────────────────
 *   cash       = SUM displayed_cash (branches only)
 *   bank       = SUM displayed_bank (branches) + online advance
 *   final_bank = bank + sslzc_received + pathao_received
 *
 * ── Owner ────────────────────────────────────────────────────────────────────
 *   total_cash      = cash + cash_invest
 *   total_bank      = final_bank + bank_invest
 *   cash_after_cost = total_cash − cash_cost
 *   bank_after_cost = total_bank − bank_cost
 */
class CashSheetController extends Controller
{
    private const CASH_TYPES = ['cash'];

    // ── GET /api/cash-sheet ──────────────────────────────────────────────

    public function index(Request $request)
    {
        $request->validate(['month' => 'nullable|date_format:Y-m']);
        $month    = $request->input('month', now()->format('Y-m'));
        $dateFrom = Carbon::parse($month.'-01')->startOfMonth()->toDateString();
        $dateTo   = Carbon::parse($month.'-01')->endOfMonth()->toDateString();

        $stores   = Store::where('is_active', true)
                         ->orderBy('is_warehouse')
                         ->orderBy('id')
                         ->get(['id','name','is_warehouse']);
        $storeIds = $stores->pluck('id')->toArray();
        $dates    = collect(CarbonPeriod::create($dateFrom, $dateTo))->map(fn($d) => $d->toDateString());

        $rawSales      = $this->loadBranchSales($storeIds, $dateFrom, $dateTo);
        $rawPayments   = $this->loadBranchPayments($storeIds, $dateFrom, $dateTo);
        $branchReturns = $this->loadBranchReturns($storeIds, $dateFrom, $dateTo);
        $branchCosts   = $this->loadBranchCosts($storeIds, $dateFrom, $dateTo);
        $adminData     = $this->loadAdminEntries($dateFrom, $dateTo);
        $onlineData    = $this->loadOnlineData($dateFrom, $dateTo);
        $ownerData     = $this->loadOwnerEntries($dateFrom, $dateTo);

        $rows = [];
        foreach ($dates as $date) {
            $branches  = [];
            $totalCash = 0;
            $totalBank = 0;
            $totalSale = 0;

            foreach ($stores as $store) {
                $sid = $store->id;

                $raw_cash     = (float)($rawPayments[$sid][$date]['cash'] ?? 0);
                $raw_bank     = (float)($rawPayments[$sid][$date]['bank'] ?? 0);
                $sale         = (float)($rawSales[$sid][$date] ?? 0);
                $ex_on        = (float)($branchReturns[$sid][$date] ?? 0);
                $daily_cost   = (float)($branchCosts[$sid][$date] ?? 0);
                $salary       = (float)($adminData[$sid][$date]['salary_setaside'] ?? 0);
                $cash_to_bank = (float)($adminData[$sid][$date]['cash_to_bank']    ?? 0);

                $disp_cash = max(0, $raw_cash - $salary - $cash_to_bank);
                $disp_bank = $raw_bank + $cash_to_bank;

                $branches[] = [
                    'store_id'     => $sid,
                    'store_name'   => $store->name,
                    'daily_sale'   => $sale,
                    'raw_cash'     => $raw_cash,
                    'cash'         => $disp_cash,
                    'bank'         => $disp_bank,
                    'ex_on'        => $ex_on,
                    'salary'       => $salary,
                    'cash_to_bank' => $cash_to_bank,
                    'daily_cost'   => $daily_cost,
                ];

                $totalSale += $sale;
                $totalCash += $disp_cash;
                $totalBank += $disp_bank;
            }

            $online     = $onlineData[$date] ?? [];
            $ol_sales   = (float)($online['daily_sales']   ?? 0);
            $ol_advance = (float)($online['advance']        ?? 0);
            $ol_payment = (float)($online['online_payment'] ?? 0);
            $ol_cod     = (float)($online['cod']            ?? 0);

            $totalBank += $ol_advance; // online advance → bank

            $sslzc_recv  = (float)($adminData['_global'][$date]['sslzc']  ?? 0);
            $pathao_recv = (float)($adminData['_global'][$date]['pathao'] ?? 0);

            $owner       = $ownerData[$date] ?? [];
            $cash_invest = (float)($owner['cash_invest'] ?? 0);
            $bank_invest = (float)($owner['bank_invest'] ?? 0);
            $cash_cost   = (float)($owner['cash_cost']   ?? 0);
            $bank_cost   = (float)($owner['bank_cost']   ?? 0);

            $final_bank      = $totalBank + $sslzc_recv + $pathao_recv;
            $total_cash      = $totalCash + $cash_invest;
            $total_bank      = $final_bank + $bank_invest;
            $cash_after_cost = $total_cash - $cash_cost;
            $bank_after_cost = $total_bank - $bank_cost;

            $rows[] = [
                'date'     => $date,
                'branches' => $branches,
                'online'   => [
                    'daily_sales'    => $ol_sales,
                    'advance'        => $ol_advance,
                    'online_payment' => $ol_payment,
                    'cod'            => $ol_cod,
                ],
                'disbursements' => [
                    'sslzc_received'  => $sslzc_recv,
                    'pathao_received' => $pathao_recv,
                ],
                'totals' => [
                    'total_sale' => $totalSale + $ol_sales,
                    'cash'       => $totalCash,
                    'bank'       => $totalBank,
                    'final_bank' => $final_bank,
                ],
                'owner' => [
                    'cash_invest'     => $cash_invest,
                    'bank_invest'     => $bank_invest,
                    'total_cash'      => $total_cash,
                    'total_bank'      => $total_bank,
                    'cash_cost'       => $cash_cost,
                    'bank_cost'       => $bank_cost,
                    'cash_after_cost' => $cash_after_cost,
                    'bank_after_cost' => $bank_after_cost,
                ],
            ];
        }

        return response()->json([
            'success' => true,
            'month'   => $month,
            'stores'  => $stores->map(fn($s) => ['id' => $s->id, 'name' => $s->name, 'is_warehouse' => (bool) $s->is_warehouse]),
            'data'    => $rows,
            'summary' => $this->buildSummary($rows, $stores),
        ]);
    }

    // ── GET /api/cash-sheet/entries?date=2026-04-14 ──────────────────────

    public function entries(Request $request)
    {
        $request->validate(['date' => 'required|date']);
        $date = Carbon::parse($request->date)->toDateString();

        return response()->json([
            'success'       => true,
            'date'          => $date,
            'branch_costs'  => BranchCostEntry::with(['store:id,name,is_warehouse','createdBy:id,name'])
                                ->whereDate('entry_date', $date)->orderByDesc('created_at')->get(),
            'admin_entries' => AdminEntry::with(['store:id,name,is_warehouse','createdBy:id,name'])
                                ->whereDate('entry_date', $date)->orderByDesc('created_at')->get(),
            'owner_entries' => OwnerEntry::with(['createdBy:id,name'])
                                ->whereDate('entry_date', $date)->orderByDesc('created_at')->get(),
        ]);
    }

    // ── POST /api/cash-sheet/branch-cost ────────────────────────────────

    public function storeBranchCost(Request $request)
    {
        $v = $request->validate([
            'entry_date' => 'required|date',
            'store_id'   => 'required|integer|exists:stores,id',
            'amount'     => 'required|numeric|min:0.01',
            'details'    => 'nullable|string|max:500',
        ]);
        $entry = BranchCostEntry::create([...$v, 'created_by' => Auth::guard('api')->id()]);
        return response()->json(['success' => true, 'entry' => $entry->load('createdBy:id,name')], 201);
    }

    public function destroyBranchCost(int $id)
    {
        BranchCostEntry::findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }

    // ── POST /api/cash-sheet/admin ───────────────────────────────────────

    public function storeAdmin(Request $request)
    {
        $v = $request->validate([
            'entry_date' => 'required|date',
            'type'       => 'required|in:salary_setaside,cash_to_bank,sslzc,pathao',
            'store_id'   => 'nullable|integer|exists:stores,id',
            'amount'     => 'required|numeric|min:0.01',
            'details'    => 'nullable|string|max:500',
        ]);
        if (in_array($v['type'], ['salary_setaside','cash_to_bank']) && empty($v['store_id'])) {
            return response()->json(['message' => 'store_id required for this type.'], 422);
        }
        $entry = AdminEntry::create([
            ...$v,
            'store_id'   => in_array($v['type'], ['sslzc','pathao']) ? null : $v['store_id'],
            'created_by' => Auth::guard('api')->id(),
        ]);
        return response()->json(['success' => true, 'entry' => $entry->load(['store:id,name','createdBy:id,name'])], 201);
    }

    public function destroyAdmin(int $id)
    {
        AdminEntry::findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }

    // ── POST /api/cash-sheet/owner ───────────────────────────────────────

    public function storeOwner(Request $request)
    {
        $v = $request->validate([
            'entry_date' => 'required|date',
            'type'       => 'required|in:cash_invest,bank_invest,cash_cost,bank_cost',
            'amount'     => 'required|numeric|min:0.01',
            'details'    => 'nullable|string|max:500',
        ]);
        $entry = OwnerEntry::create([...$v, 'created_by' => Auth::guard('api')->id()]);
        return response()->json(['success' => true, 'entry' => $entry->load('createdBy:id,name')], 201);
    }

    public function destroyOwner(int $id)
    {
        OwnerEntry::findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }

    // ── Private loaders ──────────────────────────────────────────────────

    private function loadBranchSales(array $ids, string $from, string $to): array
    {
        $out = [];
        DB::table('orders')
            ->select('store_id', DB::raw('DATE(created_at) as day'), DB::raw('SUM(total_amount) as total'))
            ->whereIn('store_id', $ids)->where('order_type','counter')
            ->whereDate('created_at','>=',$from)->whereDate('created_at','<=',$to)
            ->whereNotIn('status',['cancelled','refunded'])
            ->groupBy('store_id','day')->get()
            ->each(fn($r) => $out[$r->store_id][$r->day] = (float)$r->total);
        return $out;
    }

    private function loadBranchPayments(array $ids, string $from, string $to): array
    {
        $out = [];
        DB::table('order_payments as op')
            ->join('payment_methods as pm','pm.id','=','op.payment_method_id')
            ->join('orders as o','o.id','=','op.order_id')
            ->select('op.store_id', DB::raw('DATE(op.completed_at) as day'), 'pm.type as mt', DB::raw('SUM(op.amount) as total'))
            ->whereIn('op.store_id',$ids)->where('o.order_type','counter')
            ->whereDate('op.completed_at','>=',$from)->whereDate('op.completed_at','<=',$to)
            ->where('op.status','completed')
            ->whereNotIn('op.payment_type',['exchange_balance','store_credit','balance_carryover'])
            ->whereNotNull('op.completed_at')
            ->groupBy('op.store_id','day','pm.type')->get()
            ->each(function($r) use (&$out) {
                $b = in_array($r->mt, self::CASH_TYPES) ? 'cash' : 'bank';
                $out[$r->store_id][$r->day][$b] = ($out[$r->store_id][$r->day][$b] ?? 0) + (float)$r->total;
            });
        return $out;
    }

    private function loadBranchReturns(array $ids, string $from, string $to): array
    {
        $out = [];
        DB::table('product_returns as pr')
            ->join('orders as o','o.id','=','pr.order_id')
            ->select('o.store_id', DB::raw('DATE(pr.created_at) as day'), DB::raw('SUM(pr.total_return_value) as total'))
            ->whereIn('o.store_id',$ids)->where('o.order_type','counter')
            ->whereIn('pr.status',['approved','completed'])
            ->whereDate('pr.created_at','>=',$from)->whereDate('pr.created_at','<=',$to)
            ->groupBy('o.store_id','day')->get()
            ->each(fn($r) => $out[$r->store_id][$r->day] = (float)$r->total);
        return $out;
    }

    private function loadBranchCosts(array $ids, string $from, string $to): array
    {
        $out = [];
        BranchCostEntry::select('store_id', DB::raw('DATE(entry_date) as day'), DB::raw('SUM(amount) as total'))
            ->whereIn('store_id',$ids)->whereBetween('entry_date',[$from,$to])
            ->groupBy('store_id','day')->get()
            ->each(fn($r) => $out[$r->store_id][$r->day] = (float)$r->total);
        return $out;
    }

    /** Returns [store_id|'_global'][date][type] = sum */
    private function loadAdminEntries(string $from, string $to): array
    {
        $out = [];
        AdminEntry::select('store_id','type', DB::raw('DATE(entry_date) as day'), DB::raw('SUM(amount) as total'))
            ->whereBetween('entry_date',[$from,$to])
            ->groupBy('store_id','type','day')->get()
            ->each(function($r) use (&$out) {
                $key = in_array($r->type,['sslzc','pathao']) ? '_global' : (string)$r->store_id;
                $out[$key][$r->day][$r->type] = ($out[$key][$r->day][$r->type] ?? 0) + (float)$r->total;
            });
        return $out;
    }

    private function loadOnlineData(string $from, string $to): array
    {
        $out = [];
        DB::table('orders')
            ->select(DB::raw('DATE(created_at) as day'), DB::raw('SUM(total_amount) as ts'), DB::raw('SUM(paid_amount) as adv'), DB::raw('SUM(outstanding_amount) as cod'))
            ->where('order_type','social_commerce')
            ->whereDate('created_at','>=',$from)->whereDate('created_at','<=',$to)
            ->whereNotIn('status',['cancelled','refunded'])->groupBy('day')->get()
            ->each(function($r) use (&$out) {
                $out[$r->day]['daily_sales'] = ($out[$r->day]['daily_sales'] ?? 0) + (float)$r->ts;
                $out[$r->day]['advance']     = ($out[$r->day]['advance']     ?? 0) + (float)$r->adv;
                $out[$r->day]['cod']         = ($out[$r->day]['cod']         ?? 0) + (float)$r->cod;
            });
        DB::table('orders')
            ->select(DB::raw('DATE(created_at) as day'), DB::raw('SUM(total_amount) as ts'), DB::raw('SUM(paid_amount) as op'))
            ->where('order_type','ecommerce')
            ->whereDate('created_at','>=',$from)->whereDate('created_at','<=',$to)
            ->whereNotIn('status',['cancelled','refunded'])->groupBy('day')->get()
            ->each(function($r) use (&$out) {
                $out[$r->day]['daily_sales']    = ($out[$r->day]['daily_sales']    ?? 0) + (float)$r->ts;
                $out[$r->day]['online_payment'] = ($out[$r->day]['online_payment'] ?? 0) + (float)$r->op;
            });
        return $out;
    }

    private function loadOwnerEntries(string $from, string $to): array
    {
        $out = [];

        DB::table('owner_entries')
            ->selectRaw('entry_date as day, type, SUM(amount) as total')
            ->whereDate('entry_date', '>=', $from)
            ->whereDate('entry_date', '<=', $to)
            ->groupBy('day', 'type')
            ->get()
            ->each(function ($r) use (&$out) {
                $day = Carbon::parse($r->day)->toDateString();
                $out[$day][$r->type] = ($out[$day][$r->type] ?? 0) + (float) $r->total;
            });

        return $out;
    }

    private function buildSummary(array $rows, $stores): array
    {
        $s = [
            'branches'      => [],
            'online'        => ['daily_sales'=>0,'advance'=>0,'online_payment'=>0,'cod'=>0],
            'disbursements' => ['sslzc_received'=>0,'pathao_received'=>0],
            'totals'        => ['total_sale'=>0,'cash'=>0,'bank'=>0,'final_bank'=>0],
            'owner'         => ['cash_invest'=>0,'bank_invest'=>0,'total_cash'=>0,'total_bank'=>0,'cash_cost'=>0,'bank_cost'=>0,'cash_after_cost'=>0,'bank_after_cost'=>0],
        ];
        foreach ($stores as $st) {
            $s['branches'][$st->id] = ['store_id'=>$st->id,'store_name'=>$st->name,'daily_sale'=>0,'cash'=>0,'bank'=>0,'ex_on'=>0,'salary'=>0,'cash_to_bank'=>0,'daily_cost'=>0];
        }
        foreach ($rows as $row) {
            foreach ($row['branches'] as $b) {
                foreach (['daily_sale','cash','bank','ex_on','salary','cash_to_bank','daily_cost'] as $f) {
                    $s['branches'][$b['store_id']][$f] += $b[$f];
                }
            }
            foreach (['daily_sales','advance','online_payment','cod'] as $f) $s['online'][$f] += $row['online'][$f];
            $s['disbursements']['sslzc_received']  += $row['disbursements']['sslzc_received'];
            $s['disbursements']['pathao_received'] += $row['disbursements']['pathao_received'];
            foreach (['total_sale','cash','bank','final_bank'] as $f) $s['totals'][$f] += $row['totals'][$f];
            foreach (['cash_invest','bank_invest','total_cash','total_bank','cash_cost','bank_cost','cash_after_cost','bank_after_cost'] as $f) $s['owner'][$f] += $row['owner'][$f];
        }
        array_walk_recursive($s, fn(&$v) => $v = is_float($v) ? round($v,2) : $v);
        $s['branches'] = array_values($s['branches']);
        return $s;
    }
}
