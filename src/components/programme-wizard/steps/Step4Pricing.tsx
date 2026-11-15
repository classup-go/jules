'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DollarSign, AlertCircle, Info } from 'lucide-react'

interface Step4PricingProps {
  price: number
  currency: string
  onChange: (field: 'price' | 'currency', value: number | string) => void
  onNext: () => void
  onBack: () => void
}

const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'TND', symbol: 'DT', name: 'Dinar Tunisien', flag: '🇹🇳' },
  { code: 'XOF', symbol: 'CFA', name: 'Franc CFA', flag: '🌍' },
  { code: 'USD', symbol: '$', name: 'Dollar US', flag: '🇺🇸' },
  { code: 'CAD', symbol: 'CAD$', name: 'Dollar Canadien', flag: '🇨🇦' },
]

const PRICE_SUGGESTIONS = {
  EUR: [19, 49, 99, 149, 299],
  TND: [50, 120, 250, 400, 800],
  XOF: [10000, 25000, 50000, 75000, 150000],
  USD: [20, 50, 100, 150, 300],
  CAD: [25, 60, 120, 180, 350],
}

/**
 * Step 4: Tarification
 * Prix et devise
 */
export default function Step4Pricing({
  price,
  currency,
  onChange,
  onNext,
  onBack,
}: Step4PricingProps) {
  const [errors, setErrors] = useState<string[]>([])
  const [pricingModel, setPricingModel] = useState<'free' | 'paid'>(
    price === 0 ? 'free' : 'paid'
  )

  const selectedCurrency = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0]
  const suggestions = PRICE_SUGGESTIONS[currency as keyof typeof PRICE_SUGGESTIONS] || PRICE_SUGGESTIONS.EUR

  const handleNext = () => {
    const newErrors: string[] = []

    if (pricingModel === 'paid' && price <= 0) {
      newErrors.push('Veuillez définir un prix supérieur à 0')
    }

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors([])
    onNext()
  }

  const handlePricingModelChange = (model: 'free' | 'paid') => {
    setPricingModel(model)
    if (model === 'free') {
      onChange('price', 0)
    } else if (price === 0) {
      onChange('price', suggestions[1]) // Prix moyen par défaut
    }
  }

  const handlePriceSuggestion = (suggestedPrice: number) => {
    onChange('price', suggestedPrice)
    setPricingModel('paid')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Tarification</h2>
        <p className="text-muted-foreground mt-2">
          Définissez le prix de votre programme
        </p>
      </div>

      {/* Erreurs */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Modèle de tarification */}
      <Card>
        <CardHeader>
          <CardTitle>Modèle de tarification</CardTitle>
          <CardDescription>
            Choisissez si votre programme sera gratuit ou payant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={pricingModel} onValueChange={handlePricingModelChange}>
            <div className="space-y-3">
              {/* Gratuit */}
              <label
                className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  pricingModel === 'free'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value="free" id="free" />
                <div className="flex-1">
                  <div className="font-medium">Gratuit</div>
                  <p className="text-sm text-muted-foreground">
                    Votre programme sera accessible gratuitement à tous les étudiants
                  </p>
                </div>
                {pricingModel === 'free' && (
                  <Badge variant="secondary">Sélectionné</Badge>
                )}
              </label>

              {/* Payant */}
              <label
                className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  pricingModel === 'paid'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value="paid" id="paid" />
                <div className="flex-1">
                  <div className="font-medium">Payant</div>
                  <p className="text-sm text-muted-foreground">
                    Les étudiants devront payer pour accéder à votre programme
                  </p>
                </div>
                {pricingModel === 'paid' && (
                  <Badge variant="secondary">Sélectionné</Badge>
                )}
              </label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Configuration du prix (si payant) */}
      {pricingModel === 'paid' && (
        <>
          {/* Devise */}
          <Card>
            <CardHeader>
              <CardTitle>Devise</CardTitle>
              <CardDescription>
                Sélectionnez la devise dans laquelle vous souhaitez vendre
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {CURRENCIES.map((curr) => (
                  <button
                    key={curr.code}
                    onClick={() => {
                      onChange('currency', curr.code)
                      // Ajuster le prix selon la devise
                      const newSuggestions = PRICE_SUGGESTIONS[curr.code as keyof typeof PRICE_SUGGESTIONS]
                      if (newSuggestions && price > 0) {
                        onChange('price', newSuggestions[1])
                      }
                    }}
                    className={`p-3 rounded-lg border-2 text-center transition-colors ${
                      currency === curr.code
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-2xl mb-1">{curr.flag}</div>
                    <div className="font-medium text-sm">{curr.code}</div>
                    <div className="text-xs text-muted-foreground">{curr.symbol}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Prix */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Prix du programme
              </CardTitle>
              <CardDescription>
                Définissez le prix en {selectedCurrency.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Input prix */}
              <div className="space-y-2">
                <Label htmlFor="price">
                  Prix ({selectedCurrency.symbol})
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="1"
                    value={price}
                    onChange={(e) => onChange('price', parseFloat(e.target.value) || 0)}
                    className="text-xl font-bold"
                  />
                  <span className="text-muted-foreground">{selectedCurrency.symbol}</span>
                </div>
              </div>

              {/* Suggestions de prix */}
              <div className="space-y-2">
                <Label>Prix suggérés</Label>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestedPrice) => (
                    <Button
                      key={suggestedPrice}
                      variant={price === suggestedPrice ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePriceSuggestion(suggestedPrice)}
                    >
                      {suggestedPrice} {selectedCurrency.symbol}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Aperçu */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Prix affiché aux étudiants:</span>
                  <span className="text-2xl font-bold">
                    {price} {selectedCurrency.symbol}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Les étudiants dans d'autres pays verront le prix converti dans leur devise locale
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Info commission */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">Commission de la plateforme</p>
              <p className="text-sm">
                Jules prélève une commission de <strong>20%</strong> sur chaque vente.
                Sur un programme à {price} {selectedCurrency.symbol}, vous recevrez{' '}
                <strong>{(price * 0.8).toFixed(2)} {selectedCurrency.symbol}</strong>.
              </p>
            </AlertDescription>
          </Alert>
        </>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Retour
        </Button>
        <Button onClick={handleNext}>
          Continuer
        </Button>
      </div>
    </div>
  )
}
