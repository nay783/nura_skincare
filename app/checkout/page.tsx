"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProductImage } from "@/components/product/ProductImage";
import Link from "next/link";
import { 
  Check, 
  Copy, 
  CreditCard, 
  Upload, 
  Smartphone, 
  MapPin, 
  User, 
  DollarSign,
  Truck,
  Calendar,
  Clock,
  ArrowLeft,
  ArrowRight,
  Store
} from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";

type Step = "contacto" | "entrega" | "pagamento" | "resumo";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartSubtotal, clearCart } = useCart();

  // Wizard state
  const [step, setStep] = useState<Step>("contacto");

  // Step 1: Contact
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // Step 2: Shipping
  const [deliveryMethod, setDeliveryMethod] = useState<"entrega" | "levantamento">("entrega");
  const [provincia, setProvincia] = useState("Maputo Cidade");
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [morada, setMorada] = useState("");
  const [pontoReferencia, setPontoReferencia] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");

  // Step 3: Payment
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "credito" | "levantamento_cash">("mpesa");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // M-Pesa upload
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofStatus, setProofStatus] = useState<"none" | "uploading" | "success">("none");

  // Store credit mock (e.g. Customer has 3.000 MT)
  const mockCreditBalance = 3000;
  const [useStoreCredit, setUseStoreCredit] = useState(false);

  // Order Reference (persisted across mounts)
  const [orderRef] = useState(() => {
    const num = Math.floor(100 + Math.random() * 900);
    return `#${num}`;
  });

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.length === 0 && step !== "resumo") {
      router.push("/cart");
    }
  }, [cart, step, router]);

  // Calculations
  const deliveryFee = deliveryMethod === "entrega" ? 250 : 0;
  const appliedCredit = useStoreCredit ? Math.min(mockCreditBalance, cartSubtotal + deliveryFee) : 0;
  const orderTotal = Math.max(0, cartSubtotal + deliveryFee - appliedCredit);

  // Helper to copy values to clipboard
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Handle proof upload simulation
  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
      setProofStatus("uploading");
      setTimeout(() => {
        setProofStatus("success");
      }, 1500);
    }
  };

  // Submit Order Creation
  const handleCreateOrder = () => {
    // Collect order details, send to success page, and clear local cart
    const params = new URLSearchParams({
      orderId: orderRef,
      total: (cartSubtotal + deliveryFee).toString(),
      delivery: deliveryMethod,
      payment: paymentMethod,
      credit: appliedCredit.toString(),
      remaining: orderTotal.toString(),
      name: nome,
      proof: proofFile ? "true" : "false"
    });

    clearCart();
    router.push(`/checkout/success?${params.toString()}`);
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full font-sans">
      
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/cart"
          className="text-xs font-semibold text-secondary hover:text-primary transition-all uppercase tracking-wider inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> Voltar ao carrinho
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        {/* Left Side: Wizard Forms */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Steps Progress Indicator */}
          <div className="flex border border-border bg-white p-4 rounded-sm items-center justify-around text-xs uppercase tracking-widest font-semibold text-muted-foreground">
            <button 
              onClick={() => setStep("contacto")}
              className={`flex items-center gap-1.5 ${step === "contacto" ? "text-primary border-b border-primary pb-1" : "text-muted-foreground"}`}
            >
              <User className="h-4 w-4 stroke-[1.5]" />
              1. Contacto
            </button>
            <span className="text-border">/</span>
            <button 
              onClick={() => nome && email && whatsapp && setStep("entrega")}
              disabled={!nome || !email || !whatsapp}
              className={`flex items-center gap-1.5 ${step === "entrega" ? "text-primary border-b border-primary pb-1" : "text-muted-foreground"} disabled:opacity-50`}
            >
              <MapPin className="h-4 w-4 stroke-[1.5]" />
              2. Entrega
            </button>
            <span className="text-border">/</span>
            <button 
              onClick={() => nome && email && whatsapp && setStep("pagamento")}
              disabled={!nome || !email || !whatsapp}
              className={`flex items-center gap-1.5 ${step === "pagamento" ? "text-primary border-b border-primary pb-1" : "text-muted-foreground"} disabled:opacity-50`}
            >
              <CreditCard className="h-4 w-4 stroke-[1.5]" />
              3. Pagamento
            </button>
          </div>

          <div className="border border-border p-6 bg-white rounded-sm space-y-6">
            
            {/* Step 1: Contacto */}
            {step === "contacto" && (
              <div className="space-y-6">
                <div className="border-b border-border pb-3">
                  <h2 className="font-serif text-xl text-primary font-medium">Informação de Contacto</h2>
                  <p className="text-xs text-muted-foreground">Insira os seus dados de contacto para receber as notificações da encomenda.</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-primary mb-1">Nome completo</label>
                    <Input 
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Naylton Chilundo"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-primary mb-1">Email</label>
                      <Input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Ex: naylton@exemplo.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-primary mb-1">Número de WhatsApp</label>
                      <Input 
                        type="tel"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="Ex: +258 84 533 0990"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={() => setStep("entrega")}
                    disabled={!nome || !email || !whatsapp}
                    variant="primary"
                    className="h-11 rounded-sm text-xs px-8 flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    Seguinte: Entrega <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Entrega ou Levantamento */}
            {step === "entrega" && (
              <div className="space-y-6">
                <div className="border-b border-border pb-3">
                  <h2 className="font-serif text-xl text-primary font-medium">Método de Recepção</h2>
                  <p className="text-xs text-muted-foreground">Escolha se prefere receber a sua encomenda em casa ou levantar pessoalmente no nosso ponto de recolha.</p>
                </div>

                {/* Delivery Options Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMethod("entrega");
                      // Reset payment method to valid delivery option if needed
                      if (paymentMethod === "levantamento_cash") {
                        setPaymentMethod("mpesa");
                      }
                    }}
                    className={`p-4 border rounded-sm text-left flex items-start gap-3 transition-all ${
                      deliveryMethod === "entrega" ? "border-primary bg-primary/[0.02]" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Truck className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wider text-primary">Entrega ao domicílio</span>
                      <span className="block text-[11px] text-muted-foreground mt-0.5">Enviamos para qualquer província de Moçambique. Taxa: 250 MT.</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("levantamento")}
                    className={`p-4 border rounded-sm text-left flex items-start gap-3 transition-all ${
                      deliveryMethod === "levantamento" ? "border-primary bg-primary/[0.02]" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Store className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wider text-primary">Levantamento em Loja</span>
                      <span className="block text-[11px] text-muted-foreground mt-0.5">Sem taxa de entrega. Recolha no nosso ponto em Maputo mediante confirmação.</span>
                    </div>
                  </button>
                </div>

                {/* Conditional Fields: Delivery Address */}
                {deliveryMethod === "entrega" && (
                  <div className="space-y-4 pt-2 border-t border-border/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-primary mb-1">Província</label>
                        <select
                          value={provincia}
                          onChange={(e) => setProvincia(e.target.value)}
                          className="w-full h-11 px-3 border border-border text-sm rounded-sm bg-white focus:outline-none focus:border-primary"
                        >
                          <option value="Maputo Cidade">Maputo Cidade</option>
                          <option value="Maputo Província">Maputo Província</option>
                          <option value="Gaza">Gaza</option>
                          <option value="Inhambane">Inhambane</option>
                          <option value="Sofala">Sofala</option>
                          <option value="Manica">Manica</option>
                          <option value="Tete">Tete</option>
                          <option value="Zambézia">Zambézia</option>
                          <option value="Nampula">Nampula</option>
                          <option value="Cabo Delgado">Cabo Delgado</option>
                          <option value="Niassa">Niassa</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-primary mb-1">Cidade / Distrito</label>
                        <Input 
                          value={cidade}
                          onChange={(e) => setCidade(e.target.value)}
                          placeholder="Ex: Maputo, Matola, Beira"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-primary mb-1">Bairro</label>
                        <Input 
                          value={bairro}
                          onChange={(e) => setBairro(e.target.value)}
                          placeholder="Ex: Coop, Sommerschield, Central"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-primary mb-1">Morada / Rua & Casa</label>
                        <Input 
                          value={morada}
                          onChange={(e) => setMorada(e.target.value)}
                          placeholder="Ex: Av. Vladimir Lenine, n.º 120"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-primary mb-1">Ponto de Referência</label>
                      <Input 
                        value={pontoReferencia}
                        onChange={(e) => setPontoReferencia(e.target.value)}
                        placeholder="Ex: Próximo ao supermercado, paragem de autocarros"
                      />
                    </div>
                  </div>
                )}

                {/* Conditional Fields: Pickup Scheduling */}
                {deliveryMethod === "levantamento" && (
                  <div className="space-y-4 pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground bg-amber-50 p-4 border border-amber-100 rounded-sm leading-relaxed">
                      ✓ Ponto de recolha em Maputo. Por favor, agende um dia e hora de preferência para o levantamento. A nossa equipa entrará em contacto pelo WhatsApp para confirmar a morada exata e disponibilidade imediata da encomenda.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-primary mb-1">Data pretendida</label>
                        <div className="relative">
                          <Input 
                            type="date"
                            value={pickupDate}
                            onChange={(e) => setPickupDate(e.target.value)}
                            required
                            className="pr-10"
                          />
                          <Calendar className="absolute right-3 top-3 h-5 w-5 text-neutral-400 stroke-[1.5]" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-primary mb-1">Hora aproximada</label>
                        <div className="relative">
                          <Input 
                            type="time"
                            value={pickupTime}
                            onChange={(e) => setPickupTime(e.target.value)}
                            required
                            className="pr-10"
                          />
                          <Clock className="absolute right-3 top-3 h-5 w-5 text-neutral-400 stroke-[1.5]" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-between">
                  <Button
                    onClick={() => setStep("contacto")}
                    variant="outline"
                    className="h-11 rounded-sm text-xs px-6 uppercase tracking-wider"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={() => setStep("pagamento")}
                    disabled={deliveryMethod === "entrega" ? (!cidade || !bairro || !morada) : (!pickupDate || !pickupTime)}
                    variant="primary"
                    className="h-11 rounded-sm text-xs px-8 flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    Seguinte: Pagamento <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Pagamento */}
            {step === "pagamento" && (
              <div className="space-y-6">
                <div className="border-b border-border pb-3">
                  <h2 className="font-serif text-xl text-primary font-medium">Método de Pagamento</h2>
                  <p className="text-xs text-muted-foreground">Selecione o seu método de pagamento preferido. Suportamos M-Pesa manual e Crédito da Loja.</p>
                </div>

                {/* Payment Option Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("mpesa")}
                    className={`p-4 border rounded-sm text-left flex items-start gap-3 transition-all ${
                      paymentMethod === "mpesa" ? "border-primary bg-primary/[0.02]" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Smartphone className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wider text-primary">Vodacom M-Pesa</span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5">Envio de fundos manual e envio de comprovativo.</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("credito")}
                    className={`p-4 border rounded-sm text-left flex items-start gap-3 transition-all ${
                      paymentMethod === "credito" ? "border-primary bg-primary/[0.02]" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <DollarSign className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wider text-primary">Crédito da Loja</span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5">Use o seu saldo acumulado na Nura Skincare.</span>
                    </div>
                  </button>

                  {deliveryMethod === "levantamento" && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("levantamento_cash")}
                      className={`p-4 border rounded-sm text-left flex items-start gap-3 transition-all ${
                        paymentMethod === "levantamento_cash" ? "border-primary bg-primary/[0.02]" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Store className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-xs font-semibold uppercase tracking-wider text-primary">Pagar na recolha</span>
                        <span className="block text-[10px] text-muted-foreground mt-0.5">Pagamento em dinheiro ou M-Pesa no ato do levantamento.</span>
                      </div>
                    </button>
                  )}
                </div>

                {/* Payment Detail: M-Pesa Manual Flow */}
                {paymentMethod === "mpesa" && (
                  <div className="space-y-6 pt-4 border-t border-border/50">
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Instruções M-Pesa</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Envie o valor exato da encomenda para o número M-Pesa abaixo indicado. 
                        Use a referência gerada e carregue o comprovativo da transação.
                      </p>
                    </div>

                    {/* Copy widgets */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="border border-border p-4 bg-background rounded-sm flex items-center justify-between">
                        <div>
                          <span className="block text-[10px] uppercase text-muted-foreground font-semibold">Número M-Pesa</span>
                          <span className="block text-sm font-semibold text-primary">845330990</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy("845330990", "phone")}
                          className="h-8 px-3 border border-border hover:border-primary text-xs font-semibold rounded-sm text-primary transition-all bg-white inline-flex items-center gap-1"
                        >
                          {copiedField === "phone" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedField === "phone" ? "Copiado" : "Copiar"}
                        </button>
                      </div>

                      <div className="border border-border p-4 bg-background rounded-sm flex items-center justify-between">
                        <div>
                          <span className="block text-[10px] uppercase text-muted-foreground font-semibold">Beneficiário</span>
                          <span className="block text-sm font-semibold text-primary">Nura Skincare</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy("Nura Skincare", "beneficiary")}
                          className="h-8 px-3 border border-border hover:border-primary text-xs font-semibold rounded-sm text-primary transition-all bg-white inline-flex items-center gap-1"
                        >
                          {copiedField === "beneficiary" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedField === "beneficiary" ? "Copiado" : "Copiar"}
                        </button>
                      </div>

                      <div className="border border-border p-4 bg-background rounded-sm flex items-center justify-between">
                        <div>
                          <span className="block text-[10px] uppercase text-muted-foreground font-semibold">Referência da Encomenda</span>
                          <span className="block text-sm font-semibold text-primary">{orderRef}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(orderRef, "ref")}
                          className="h-8 px-3 border border-border hover:border-primary text-xs font-semibold rounded-sm text-primary transition-all bg-white inline-flex items-center gap-1"
                        >
                          {copiedField === "ref" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedField === "ref" ? "Copiado" : "Copiar"}
                        </button>
                      </div>

                      <div className="border border-border p-4 bg-background rounded-sm flex items-center justify-between">
                        <div>
                          <span className="block text-[10px] uppercase text-muted-foreground font-semibold">Valor Total</span>
                          <span className="block text-sm font-semibold text-primary">{formatCurrency(cartSubtotal + deliveryFee - appliedCredit)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy((cartSubtotal + deliveryFee - appliedCredit).toString(), "value")}
                          className="h-8 px-3 border border-border hover:border-primary text-xs font-semibold rounded-sm text-primary transition-all bg-white inline-flex items-center gap-1"
                        >
                          {copiedField === "value" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedField === "value" ? "Copiado" : "Copiar"}
                        </button>
                      </div>
                    </div>

                    {/* Proof Uploader */}
                    <div className="space-y-2 pt-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-primary">Carregar comprovativo de pagamento</label>
                      <div className="relative border border-dashed border-border p-6 rounded-sm bg-background text-center flex flex-col items-center justify-center space-y-3">
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.pdf"
                          onChange={handleProofChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="h-8 w-8 stroke-[1.2] text-neutral-400" />
                        
                        {proofStatus === "none" && (
                          <div className="space-y-1">
                            <span className="block text-xs font-medium text-primary">Carregar ficheiro ou PDF</span>
                            <span className="block text-[10px] text-muted-foreground">Formatos suportados: PNG, JPG, JPEG, PDF (Máx. 5MB)</span>
                          </div>
                        )}
                        {proofStatus === "uploading" && (
                          <div className="space-y-1">
                            <span className="block text-xs font-medium text-primary animate-pulse">A carregar ficheiro...</span>
                          </div>
                        )}
                        {proofStatus === "success" && (
                          <div className="space-y-1">
                            <span className="block text-xs font-semibold text-emerald-700">✓ Comprovativo carregado com sucesso</span>
                            <span className="block text-[10px] text-muted-foreground">{proofFile?.name}</span>
                          </div>
                        )}
                      </div>
                      {proofStatus === "success" && (
                        <p className="text-[10px] text-muted-foreground italic">
                          O comprovativo foi anexado com sucesso e será validado administrativamente pela equipa da Nura.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment Detail: Store Credit Flow */}
                {paymentMethod === "credito" && (
                  <div className="space-y-6 pt-4 border-t border-border/50">
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Crédito da Loja Disponível</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Pode cobrir total ou parcialmente o valor desta encomenda utilizando o seu saldo acumulado.
                      </p>
                    </div>

                    <div className="border border-border p-6 bg-background rounded-sm space-y-4">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Saldo Total Disponível:</span>
                        <span className="font-semibold text-primary">{formatCurrency(mockCreditBalance)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Total da Encomenda:</span>
                        <span className="font-semibold text-primary">{formatCurrency(cartSubtotal + deliveryFee)}</span>
                      </div>

                      <hr className="border-border/50" />

                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={useStoreCredit}
                            onChange={(e) => setUseStoreCredit(e.target.checked)}
                            className="h-4 w-4 text-primary focus:ring-primary rounded-sm cursor-pointer"
                          />
                          <span className="text-xs font-medium text-primary">Aplicar Saldo de Crédito</span>
                        </label>
                      </div>

                      {useStoreCredit && (
                        <div className="space-y-2 pt-2 text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Crédito Aplicado:</span>
                            <span className="text-secondary font-semibold">-{formatCurrency(appliedCredit)}</span>
                          </div>
                          <div className="flex justify-between text-primary font-semibold">
                            <span>Valor Restante a Pagar:</span>
                            <span>{formatCurrency(orderTotal)}</span>
                          </div>
                          
                          {/* If remainder exists, instruct to pay remainder via M-pesa */}
                          {orderTotal > 0 && (
                            <p className="text-[10px] text-amber-600 bg-amber-50 p-3 border border-amber-100 rounded-sm mt-2 leading-relaxed">
                              ! O crédito disponível não cobre a totalidade. O valor restante de {formatCurrency(orderTotal)} deve ser liquidado via M-Pesa. Por favor, anexe o comprovativo correspondente à diferença.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment Detail: Pickup Cash Flow */}
                {paymentMethod === "levantamento_cash" && (
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Pagamento no Levantamento</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      A sua encomenda será processada e mantida em espera. O pagamento do valor exato de {formatCurrency(cartSubtotal)} deve ser liquidado no momento da recolha física no ponto de Maputo.
                    </p>
                  </div>
                )}

                <div className="pt-4 flex justify-between">
                  <Button
                    onClick={() => setStep("entrega")}
                    variant="outline"
                    className="h-11 rounded-sm text-xs px-6 uppercase tracking-wider"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={() => {
                      if (paymentMethod === "mpesa" && !proofFile) return;
                      setStep("resumo");
                    }}
                    disabled={paymentMethod === "mpesa" && proofStatus !== "success"}
                    variant="primary"
                    className="h-11 rounded-sm text-xs px-8 flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    Seguinte: Resumo <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Resumo Final */}
            {step === "resumo" && (
              <div className="space-y-6">
                <div className="border-b border-border pb-3">
                  <h2 className="font-serif text-xl text-primary font-medium">Revisão dos Dados</h2>
                  <p className="text-xs text-muted-foreground">Por favor, reveja todas as informações inseridas antes de confirmar a encomenda.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs leading-relaxed text-muted-foreground">
                  
                  {/* Contact Info */}
                  <div className="space-y-2 border border-border p-4 rounded-sm">
                    <h4 className="font-semibold text-primary uppercase tracking-wider">Contacto</h4>
                    <p><strong>Nome:</strong> {nome}</p>
                    <p><strong>Email:</strong> {email}</p>
                    <p><strong>WhatsApp:</strong> {whatsapp}</p>
                  </div>

                  {/* Shipping Info */}
                  <div className="space-y-2 border border-border p-4 rounded-sm">
                    <h4 className="font-semibold text-primary uppercase tracking-wider">Método de Recepção</h4>
                    {deliveryMethod === "entrega" ? (
                      <>
                        <p><strong>Tipo:</strong> Entrega ao Domicílio</p>
                        <p><strong>Província:</strong> {provincia}</p>
                        <p><strong>Cidade:</strong> {cidade}</p>
                        <p><strong>Bairro:</strong> {bairro}</p>
                        <p><strong>Morada:</strong> {morada}</p>
                        {pontoReferencia && <p><strong>Ponto de Ref:</strong> {pontoReferencia}</p>}
                      </>
                    ) : (
                      <>
                        <p><strong>Tipo:</strong> Levantamento em Loja</p>
                        <p><strong>Data Agendada:</strong> {pickupDate}</p>
                        <p><strong>Hora Agendada:</strong> {pickupTime}</p>
                      </>
                    )}
                  </div>

                  {/* Payment Info */}
                  <div className="space-y-2 border border-border p-4 rounded-sm sm:col-span-2">
                    <h4 className="font-semibold text-primary uppercase tracking-wider">Forma de Pagamento</h4>
                    {paymentMethod === "mpesa" ? (
                      <>
                        <p><strong>Tipo:</strong> M-Pesa Manual</p>
                        <p><strong>Ref. da Transação:</strong> {orderRef}</p>
                        <p className="text-emerald-700 font-medium">✓ Comprovativo anexado com sucesso.</p>
                      </>
                    ) : paymentMethod === "credito" ? (
                      <>
                        <p><strong>Tipo:</strong> Crédito de Loja</p>
                        <p><strong>Crédito Aplicado:</strong> -{formatCurrency(appliedCredit)}</p>
                        {orderTotal > 0 && <p className="text-amber-700"><strong>Diferença a pagar via M-Pesa:</strong> {formatCurrency(orderTotal)}</p>}
                      </>
                    ) : (
                      <>
                        <p><strong>Tipo:</strong> Dinheiro / M-Pesa no Levantamento</p>
                        <p><strong>Total a Pagar:</strong> {formatCurrency(cartSubtotal)}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <Button
                    onClick={() => setStep("pagamento")}
                    variant="outline"
                    className="h-11 rounded-sm text-xs px-6 uppercase tracking-wider"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={handleCreateOrder}
                    variant="primary"
                    className="h-12 rounded-sm text-xs px-10 uppercase tracking-wider flex items-center gap-2 font-semibold"
                  >
                    <Check className="h-4 w-4" />
                    Finalizar Encomenda
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Side: Order Summary Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="border border-border p-6 bg-white rounded-sm space-y-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-primary pb-2 border-b border-border">
              Artigos da Encomenda
            </h2>

            {/* List items */}
            <div className="divide-y divide-border max-h-80 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="py-3 flex items-center gap-3">
                  <div className="relative h-12 w-12 bg-muted rounded-sm overflow-hidden border border-border shrink-0">
                    <ProductImage
                      product={{
                        id: item.id,
                        name: item.name,
                        slug: item.slug,
                        images: [item.image],
                        main_image_url: item.image,
                      }}
                      alt={item.name}
                      fill
                      sizes="48px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs text-primary font-serif font-medium line-clamp-1">{item.name}</h4>
                    <p className="text-[10px] text-muted-foreground">{item.brand} x {item.quantity}</p>
                  </div>
                  <span className="text-xs font-semibold text-primary whitespace-nowrap">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Price lines */}
            <div className="space-y-3 pt-4 border-t border-border text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-primary font-medium">{formatCurrency(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxa de Entrega</span>
                <span className="text-primary font-medium">{formatCurrency(deliveryFee)}</span>
              </div>
              {appliedCredit > 0 && (
                <div className="flex justify-between text-secondary">
                  <span>Crédito Aplicado</span>
                  <span className="font-semibold">-{formatCurrency(appliedCredit)}</span>
                </div>
              )}

              <hr className="border-border/50" />

              <div className="flex justify-between items-baseline pt-1">
                <span className="text-sm font-semibold text-primary">Total a pagar</span>
                <span className="text-base font-bold text-primary">{formatCurrency(orderTotal)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
