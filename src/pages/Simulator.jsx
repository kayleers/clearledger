import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, CreditCard, Calendar, DollarSign, Sparkles, ChevronDown, ChevronUp, Plus, Trash2, Mail, CheckCircle, Loader2 } from 'lucide-react';
import { formatCurrency, formatMonthsToYears, calculatePayoffTimeline, calculateRequiredPayment, calculateVariablePayoffTimeline } from '@/components/utils/calculations';
import PayoffChart from '@/components/simulator/PayoffChart';
import { base44 } from '@/api/base44Client';

const getCurrencySymbol = (currency = 'USD') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(0).replace(/[\d.,\s]/g, '');
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

function newCard(id) {
  return { id, name: '', balance: '', apr: '', min_payment: '', currency: 'USD', type: 'card' };
}

export default function Simulator() {
  const [cards, setCards] = useState([newCard(1)]);
  const [paymentType, setPaymentType] = useState('fixed');
  const [cardPayments, setCardPayments] = useState({});
  const [cardTargetMonths, setCardTargetMonths] = useState({});
  // variable: { [cardId]: [{ month: number, amount: string }] }
  const [cardVariablePayments, setCardVariablePayments] = useState({});
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { cardId, month, value }
  const [nextId, setNextId] = useState(2);
  const [emailInput, setEmailInput] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const addCard = () => { setCards([...cards, newCard(nextId)]); setNextId(nextId + 1); };
  const removeCard = (id) => setCards(cards.filter(c => c.id !== id));
  const updateCard = (id, field, val) => setCards(cards.map(c => c.id === id ? { ...c, [field]: val } : c));

  const validCards = cards.filter(c => c.name && parseFloat(c.balance) > 0 && parseFloat(c.apr) >= 0 && parseFloat(c.min_payment) >= 0);

  const allScenarios = useMemo(() => {
    const scenarios = [];
    validCards.forEach(card => {
      const balance = parseFloat(card.balance);
      const apr = parseFloat(card.apr) / 100;
      const minPmt = parseFloat(card.min_payment);
      let scenario;

      if (paymentType === 'fixed') {
        const payment = parseFloat(cardPayments[card.id]) || 0;
        if (payment > 0) scenario = calculatePayoffTimeline(balance, apr, payment);
      } else if (paymentType === 'target') {
        const tm = parseInt(cardTargetMonths[card.id]) || 0;
        if (tm > 0) {
          const req = calculateRequiredPayment(balance, apr, tm);
          scenario = calculatePayoffTimeline(balance, apr, req);
        }
      } else if (paymentType === 'variable') {
        const varPayments = (cardVariablePayments[card.id] || []).map(r => ({ amount: parseFloat(r.amount) || 0 }));
        if (varPayments.some(p => p.amount > 0)) {
          scenario = calculateVariablePayoffTimeline(balance, apr, varPayments);
        }
      }

      if (scenario) {
        scenarios.push({ id: card.id, name: card.name, type: 'card', balance, apr, minPayment: minPmt, currency: card.currency, ...scenario });
      }
    });
    return scenarios;
  }, [validCards, paymentType, cardPayments, cardTargetMonths, cardVariablePayments]);

  const longestMonths = Math.max(...allScenarios.map(s => s.months), 0);

  const interestByCurrency = useMemo(() => {
    const g = {};
    allScenarios.forEach(s => { g[s.currency || 'USD'] = (g[s.currency || 'USD'] || 0) + s.totalInterest; });
    return g;
  }, [allScenarios]);

  const minScenarios = useMemo(() => [
    ...validCards.map(c => ({ ...calculatePayoffTimeline(parseFloat(c.balance), parseFloat(c.apr) / 100, parseFloat(c.min_payment)), currency: c.currency, id: c.id })),
  ], [validCards]);

  const interestSavedByCurrency = useMemo(() => {
    const g = {};
    minScenarios.forEach(min => {
      const match = allScenarios.find(s => s.id === min.id);
      if (match) {
        const curr = min.currency || 'USD';
        g[curr] = (g[curr] || 0) + (min.totalInterest - match.totalInterest);
      }
    });
    return g;
  }, [minScenarios, allScenarios]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-teal-800 p-4 pb-8">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="pt-6 pb-2 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Calculator className="w-7 h-7 text-teal-300" />
            <h1 className="text-2xl font-bold text-white">Debt Payoff Simulator</h1>
          </div>
          <p className="text-slate-300 text-sm">Enter your debts below and simulate different payment strategies</p>
        </div>

        {/* Single Simulator Card */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Calculator className="w-4 h-4 text-teal-300" />
              Payment Simulator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Debt Input */}
            <div>
              <p className="text-white flex items-center gap-2 text-sm font-medium mb-2">
                <CreditCard className="w-4 h-4 text-blue-300" />
                Credit Card or Loan
              </p>
              <div className="space-y-3">
                {cards.map((card) => (
                  <div key={card.id} className="bg-white/10 rounded-xl p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Input
                        placeholder="Name (e.g. Visa, Car Loan)"
                        value={card.name}
                        onChange={e => updateCard(card.id, 'name', e.target.value)}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/50 h-8 text-sm flex-1 mr-2"
                      />
                      {cards.length > 1 && (
                        <Button size="icon" variant="ghost" onClick={() => removeCard(card.id)} className="h-8 w-8 text-red-300 hover:text-red-200 hover:bg-red-500/20">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-2">
                        <Label className="text-white/70 text-xs">Balance ($)</Label>
                        <Input type="number" placeholder="5000" value={card.balance} onChange={e => updateCard(card.id, 'balance', e.target.value)} className="bg-white/20 border-white/30 text-white placeholder:text-white/40 h-8 text-sm" />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-white/70 text-xs">APR (%)</Label>
                        <Input type="number" placeholder="19.99" value={card.apr} onChange={e => updateCard(card.id, 'apr', e.target.value)} className="bg-white/20 border-white/30 text-white placeholder:text-white/40 h-8 text-sm" />
                      </div>
                      <div className="col-span-1">
                        <Label className="text-white/70 text-xs">Min Pmt ($)</Label>
                        <Input type="number" placeholder="25" value={card.min_payment} onChange={e => updateCard(card.id, 'min_payment', e.target.value)} className="bg-white/20 border-white/30 text-white placeholder:text-white/40 h-8 text-sm" />
                      </div>
                      <div className="col-span-1">
                        <Label className="text-white/70 text-xs">Fixed Pmt ($)</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/50 text-xs">{getCurrencySymbol(card.currency)}</span>
                          <Input
                            type="number"
                            placeholder="0"
                            value={cardPayments[card.id] || ''}
                            onChange={e => {
                              setCardPayments({ ...cardPayments, [card.id]: e.target.value });
                              if (e.target.value) setPaymentType('fixed');
                            }}
                            className="pl-5 bg-white/20 border-white/30 text-white placeholder:text-white/40 h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-white/70 text-xs">Currency</Label>
                        <select value={card.currency} onChange={e => updateCard(card.id, 'currency', e.target.value)} className="w-full h-8 text-sm bg-white/20 border border-white/30 text-white rounded-md px-2">
                          {CURRENCIES.map(c => <option key={c} value={c} className="text-slate-900">{c}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                <Button onClick={addCard} variant="ghost" className="w-full text-teal-300 hover:text-teal-200 hover:bg-white/10 border border-dashed border-white/30 h-9">
                  <Plus className="w-4 h-4 mr-2" /> Add Another
                </Button>
              </div>
            </div>

            {/* Simulator Tabs */}
            {validCards.length > 0 && (
              <div className="border-t border-white/20 pt-4 space-y-4">
                <Tabs value={paymentType} onValueChange={setPaymentType}>
                  <TabsList className="grid grid-cols-3 w-full bg-white/10">
                    <TabsTrigger value="fixed" className="text-white data-[state=active]:bg-white/20">Fixed</TabsTrigger>
                    <TabsTrigger value="target" className="text-white data-[state=active]:bg-white/20">Target</TabsTrigger>
                    <TabsTrigger value="variable" className="text-white data-[state=active]:bg-white/20">Variable</TabsTrigger>
                  </TabsList>

                  <TabsContent value="fixed" className="space-y-3 mt-4">
                    {validCards.map(card => {
                      const balance = parseFloat(card.balance);
                      const apr = parseFloat(card.apr) / 100;
                      const minPmt = parseFloat(card.min_payment);
                      const threeYearPmt = calculateRequiredPayment(balance, apr, 36);
                      return (
                        <div key={card.id} className="bg-white/10 rounded-xl p-3">
                          <p className="font-medium text-sm text-white mb-1">{card.name}</p>
                          <p className="text-xs text-white/60 mb-2">{formatCurrency(balance, card.currency)} • {card.apr}% APR</p>
                          <div className="flex gap-2">
                            <div className="relative flex-[0_0_40%]">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">{getCurrencySymbol(card.currency)}</span>
                              <Input type="number" value={cardPayments[card.id] || ''} onChange={e => setCardPayments({ ...cardPayments, [card.id]: e.target.value })} className="pl-7 h-9 bg-white/20 border-white/30 text-white placeholder:text-white/40 w-full" placeholder="0" />
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setCardPayments({ ...cardPayments, [card.id]: minPmt.toString() })} className="text-xs border-white/30 text-white bg-white/10 hover:bg-white/20 shrink-0">Min</Button>
                            <Button size="sm" variant="outline" onClick={() => setCardPayments({ ...cardPayments, [card.id]: (parseFloat(cardPayments[card.id]) || minPmt).toString() })} className="text-xs border-white/30 text-white bg-white/10 hover:bg-white/20 shrink-0" disabled={!cardPayments[card.id]}>Fixed</Button>
                            <Button size="sm" variant="outline" onClick={() => setCardPayments({ ...cardPayments, [card.id]: threeYearPmt.toString() })} className="text-xs border-white/30 text-white bg-white/10 hover:bg-white/20 shrink-0">3yr</Button>
                          </div>
                        </div>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="target" className="space-y-3 mt-4">
                    {validCards.map(card => {
                      const balance = parseFloat(card.balance);
                      const apr = parseFloat(card.apr) / 100;
                      const tm = parseInt(cardTargetMonths[card.id]) || 36;
                      const req = calculateRequiredPayment(balance, apr, tm);
                      return (
                        <div key={card.id} className="bg-white/10 rounded-xl p-3">
                          <p className="font-medium text-sm text-white mb-1">{card.name}</p>
                          <p className="text-xs text-white/60 mb-2">{formatCurrency(balance, card.currency)} • {card.apr}% APR</p>
                          <Label className="text-xs text-white/70">Target: {Math.floor(tm / 12)}y {tm % 12}m — Required: <span className="text-teal-300 font-semibold">{formatCurrency(req, card.currency)}/mo</span></Label>
                          <input type="range" min="1" max="120" value={tm} onChange={e => setCardTargetMonths({ ...cardTargetMonths, [card.id]: e.target.value })} className="w-full mt-2 accent-teal-400" />
                        </div>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="variable" className="space-y-3 mt-4">
                    <p className="text-xs text-white/60">Enter different payment amounts for each month. Leave blank to stop.</p>
                    {validCards.map(card => {
                      const rows = cardVariablePayments[card.id] || [{ month: 1, amount: '' }];
                      const updateRow = (idx, amount) => {
                        const updated = [...rows];
                        updated[idx] = { month: idx + 1, amount };
                        // Auto-add a new row if editing the last one
                        if (idx === updated.length - 1 && amount !== '') {
                          updated.push({ month: updated.length + 1, amount: '' });
                        }
                        setCardVariablePayments({ ...cardVariablePayments, [card.id]: updated });
                      };
                      const removeRow = (idx) => {
                        const updated = rows.filter((_, i) => i !== idx).map((r, i) => ({ ...r, month: i + 1 }));
                        setCardVariablePayments({ ...cardVariablePayments, [card.id]: updated.length ? updated : [{ month: 1, amount: '' }] });
                      };
                      return (
                        <div key={card.id} className="bg-white/10 rounded-xl p-3">
                          <p className="font-medium text-sm text-white mb-1">{card.name}</p>
                          <p className="text-xs text-white/60 mb-3">{formatCurrency(parseFloat(card.balance), card.currency)} • {card.apr}% APR</p>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {rows.map((row, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-white/50 text-xs w-14 shrink-0">Month {row.month}</span>
                                <div className="relative flex-1">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">{getCurrencySymbol(card.currency)}</span>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={row.amount}
                                    onChange={e => updateRow(idx, e.target.value)}
                                    className="pl-7 h-8 text-sm bg-white/20 border-white/30 text-white placeholder:text-white/40"
                                  />
                                </div>
                                {rows.length > 1 && (
                                  <Button size="icon" variant="ghost" onClick={() => removeRow(idx)} className="h-8 w-8 text-red-300 hover:text-red-200 hover:bg-red-500/20 shrink-0">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </TabsContent>
                </Tabs>

                {/* Results */}
                {allScenarios.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-white/20">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-500/20 rounded-xl text-center">
                        <Calendar className="w-5 h-5 text-blue-300 mx-auto mb-1" />
                        <p className="text-lg font-bold text-white">{formatMonthsToYears(longestMonths)}</p>
                        <p className="text-xs text-blue-200">to pay off</p>
                      </div>
                      <div className="p-3 bg-purple-500/20 rounded-xl text-center">
                        <DollarSign className="w-5 h-5 text-purple-300 mx-auto mb-1" />
                        {Object.entries(interestByCurrency).map(([curr, amt]) => (
                          <p key={curr} className="text-lg font-bold text-white">{formatCurrency(amt, curr)}</p>
                        ))}
                        <p className="text-xs text-purple-200">total interest</p>
                      </div>
                    </div>

                    {Object.values(interestSavedByCurrency).some(v => v > 0) && (
                      <div className="p-4 bg-gradient-to-r from-emerald-500/80 to-teal-500/80 rounded-xl text-white">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-4 h-4" />
                          <span className="font-medium text-sm">You Save vs. Minimums</span>
                        </div>
                        {Object.entries(interestSavedByCurrency).filter(([, v]) => v > 0).map(([curr, amt]) => (
                          <p key={curr} className="text-xl font-bold">{formatCurrency(amt, curr)}</p>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      {allScenarios.map(s => (
                        <div key={s.id} className="bg-white/10 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-blue-300" />
                              <span className="font-medium text-sm text-white">{s.name}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-white">{formatMonthsToYears(s.months)}</p>
                              <p className="text-xs text-white/60">{formatCurrency(s.totalInterest, s.currency)} interest</p>
                            </div>
                          </div>
                          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400" style={{ width: `${Math.min((s.months / longestMonths) * 100, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Email Report */}
                    <div className="p-4 bg-white/10 rounded-xl space-y-3">
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        <Mail className="w-4 h-4 text-teal-300" />
                        Email this report to yourself
                      </p>
                      {emailSent ? (
                        <div className="flex items-center gap-2 text-emerald-300 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Report sent! Check your inbox.
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            value={emailInput}
                            onChange={e => setEmailInput(e.target.value)}
                            className="bg-white/20 border-white/30 text-white placeholder:text-white/40 h-9 flex-1"
                          />
                          <Button
                            size="sm"
                            disabled={!emailInput || emailSending}
                            onClick={async () => {
                              setEmailSending(true);
                              try {
                                await base44.functions.invoke('emailSimulatorReport', {
                                  email: emailInput,
                                  scenarios: allScenarios,
                                  interestByCurrency,
                                  interestSavedByCurrency,
                                  longestMonths
                                });
                                setEmailSent(true);
                                setTimeout(() => setEmailSent(false), 8000);
                              } catch (e) {
                                alert('Failed to send email. Please try again.');
                              } finally {
                                setEmailSending(false);
                              }
                            }}
                            className="bg-teal-500 hover:bg-teal-400 text-white h-9 px-4"
                          >
                            {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                          </Button>
                        </div>
                      )}
                    </div>

                    <Button variant="ghost" className="w-full justify-between text-white/80 hover:text-white hover:bg-white/10" onClick={() => setShowBreakdown(!showBreakdown)}>
                      <span>Monthly Breakdown</span>
                      {showBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>

                    {showBreakdown && allScenarios.map(scenario => {
                       const applyPaymentOverride = (month, newAmount) => {
                         // Build variable payments from the current breakdown, overriding the edited month
                         const existing = scenario.breakdown.map((r) => ({
                           month: r.month,
                           amount: (r.month === month ? newAmount : r.payment).toString()
                         }));
                         setCardVariablePayments(prev => ({ ...prev, [scenario.id]: existing }));
                         setPaymentType('variable');
                         setEditingCell(null);
                       };

                       // Compute fresh stats directly from the scenario (which is already from allScenarios memo)
                       const liveMonths = scenario.months;
                       const liveTotalInterest = scenario.totalInterest;

                       return (
                         <div key={scenario.id} className="bg-white rounded-xl overflow-hidden">
                           <div className="px-3 py-2 bg-slate-100">
                             <p className="font-medium text-sm text-slate-700">{scenario.name}</p>
                             <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-500">
                               <span>Starting Balance: <span className="font-medium text-slate-700">{formatCurrency(scenario.balance, scenario.currency)}</span></span>
                               <span>APR: <span className="font-medium text-slate-700">{(scenario.apr * 100).toFixed(2)}%</span></span>
                               <span>Payoff: <span className="font-medium text-teal-600">{formatMonthsToYears(liveMonths)}</span></span>
                               <span>Total Interest: <span className="font-medium text-red-500">{formatCurrency(liveTotalInterest, scenario.currency)}</span></span>
                             </div>
                             <p className="text-xs text-slate-400 mt-1">Click any payment to edit it</p>
                           </div>
                          <div className="max-h-64 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                  <th className="text-left p-2 text-xs">Mo.</th>
                                  <th className="text-right p-2 text-xs">Payment</th>
                                  <th className="text-right p-2 text-xs">Interest</th>
                                  <th className="text-right p-2 text-xs">Balance</th>
                                </tr>
                              </thead>
                              <tbody>
                                {scenario.breakdown.slice(0, Math.max(60, liveMonths)).map(row => {
                                  const isEditing = editingCell?.cardId === scenario.id && editingCell?.month === row.month;
                                  return (
                                    <tr key={row.month} className="border-b border-slate-100">
                                      <td className="p-2 text-slate-600">{row.month}</td>
                                      <td className="text-right p-1 text-slate-700">
                                        {isEditing ? (
                                          <input
                                            autoFocus
                                            type="number"
                                            value={editingCell.value}
                                            onChange={e => setEditingCell({ ...editingCell, value: e.target.value })}
                                            onBlur={() => {
                                              const val = parseFloat(editingCell.value);
                                              if (!isNaN(val) && val >= 0) applyPaymentOverride(row.month, val);
                                              else setEditingCell(null);
                                            }}
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') {
                                                const val = parseFloat(editingCell.value);
                                                if (!isNaN(val) && val >= 0) applyPaymentOverride(row.month, val);
                                                else setEditingCell(null);
                                              }
                                              if (e.key === 'Escape') setEditingCell(null);
                                            }}
                                            className="w-24 text-right border border-teal-400 rounded px-1 py-0.5 text-xs focus:outline-none"
                                          />
                                        ) : (
                                          <span
                                            className="cursor-pointer hover:bg-teal-50 hover:text-teal-700 rounded px-1 py-0.5 transition-colors"
                                            onClick={() => setEditingCell({ cardId: scenario.id, month: row.month, value: row.payment.toString() })}
                                          >
                                            {formatCurrency(row.payment, scenario.currency)}
                                          </span>
                                        )}
                                      </td>
                                      <td className="text-right p-2 text-red-500">{formatCurrency(row.interest, scenario.currency)}</td>
                                      <td className="text-right p-2 font-medium text-slate-800">{formatCurrency(row.balance, scenario.currency)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            {scenario.breakdown.length > 60 && liveMonths > 60 && <p className="text-center text-xs text-slate-400 py-2">Showing first {liveMonths} of {scenario.breakdown.length} months</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}