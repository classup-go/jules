// Formats de téléphone par pays avec préfixes
export interface PhoneFormat {
  code: string
  name: string
  prefix: string
  placeholder: string
  mask: string
  example: string
}

export const PHONE_FORMATS: PhoneFormat[] = [
  {
    code: 'TN',
    name: 'Tunisie',
    prefix: '+216',
    placeholder: 'XX XXX XXX',
    mask: '## ### ###',
    example: '+216 20 123 456'
  },
  {
    code: 'FR',
    name: 'France',
    prefix: '+33',
    placeholder: 'X XX XX XX XX',
    mask: '# ## ## ## ##',
    example: '+33 6 12 34 56 78'
  },
  {
    code: 'SN',
    name: 'Sénégal',
    prefix: '+221',
    placeholder: 'XX XXX XX XX',
    mask: '## ### ## ##',
    example: '+221 77 123 45 67'
  },
  {
    code: 'CI',
    name: 'Côte d\'Ivoire',
    prefix: '+225',
    placeholder: 'XX XX XX XX XX',
    mask: '## ## ## ## ##',
    example: '+225 07 12 34 56 78'
  },
  {
    code: 'CM',
    name: 'Cameroun',
    prefix: '+237',
    placeholder: 'X XX XX XX XX',
    mask: '# ## ## ## ##',
    example: '+237 6 12 34 56 78'
  },
  {
    code: 'MA',
    name: 'Maroc',
    prefix: '+212',
    placeholder: 'X XX XX XX XX',
    mask: '# ## ## ## ##',
    example: '+212 6 12 34 56 78'
  },
  {
    code: 'DZ',
    name: 'Algérie',
    prefix: '+213',
    placeholder: 'X XX XX XX XX',
    mask: '# ## ## ## ##',
    example: '+213 5 12 34 56 78'
  },
  {
    code: 'US',
    name: 'États-Unis',
    prefix: '+1',
    placeholder: '(XXX) XXX-XXXX',
    mask: '(###) ###-####',
    example: '+1 (555) 123-4567'
  },
  {
    code: 'CA',
    name: 'Canada',
    prefix: '+1',
    placeholder: '(XXX) XXX-XXXX',
    mask: '(###) ###-####',
    example: '+1 (555) 123-4567'
  },
  {
    code: 'BE',
    name: 'Belgique',
    prefix: '+32',
    placeholder: 'XXX XX XX XX',
    mask: '### ## ## ##',
    example: '+32 456 12 34 56'
  },
  {
    code: 'CH',
    name: 'Suisse',
    prefix: '+41',
    placeholder: 'XX XXX XX XX',
    mask: '## ### ## ##',
    example: '+41 79 123 45 67'
  },
  {
    code: 'LU',
    name: 'Luxembourg',
    prefix: '+352',
    placeholder: 'XXX XXX XXX',
    mask: '### ### ###',
    example: '+352 621 123 456'
  },
  {
    code: 'BF',
    name: 'Burkina Faso',
    prefix: '+226',
    placeholder: 'XX XX XX XX',
    mask: '## ## ## ##',
    example: '+226 70 12 34 56'
  },
  {
    code: 'BJ',
    name: 'Bénin',
    prefix: '+229',
    placeholder: 'XX XX XX XX',
    mask: '## ## ## ##',
    example: '+229 97 12 34 56'
  },
  {
    code: 'GA',
    name: 'Gabon',
    prefix: '+241',
    placeholder: 'X XX XX XX',
    mask: '# ## ## ##',
    example: '+241 6 12 34 56'
  },
  {
    code: 'CG',
    name: 'Congo',
    prefix: '+242',
    placeholder: 'X XX XX XX',
    mask: '# ## ## ##',
    example: '+242 6 12 34 56'
  },
  {
    code: 'TD',
    name: 'Tchad',
    prefix: '+235',
    placeholder: 'XX XX XX XX',
    mask: '## ## ## ##',
    example: '+235 66 12 34 56'
  },
  {
    code: 'ML',
    name: 'Mali',
    prefix: '+223',
    placeholder: 'XX XX XX XX',
    mask: '## ## ## ##',
    example: '+223 76 12 34 56'
  },
  {
    code: 'NE',
    name: 'Niger',
    prefix: '+227',
    placeholder: 'XX XX XX XX',
    mask: '## ## ## ##',
    example: '+227 96 12 34 56'
  },
  {
    code: 'TG',
    name: 'Togo',
    prefix: '+228',
    placeholder: 'XX XX XX XX',
    mask: '## ## ## ##',
    example: '+228 90 12 34 56'
  },
]

export function getPhoneFormatByCountry(countryCode: string): PhoneFormat | undefined {
  return PHONE_FORMATS.find(f => f.code === countryCode)
}

export function formatPhoneNumber(phone: string, format: PhoneFormat): string {
  // Enlever tous les caractères non-numériques
  const numbers = phone.replace(/\D/g, '')

  let formatted = ''
  let numberIndex = 0

  for (let i = 0; i < format.mask.length && numberIndex < numbers.length; i++) {
    if (format.mask[i] === '#') {
      formatted += numbers[numberIndex]
      numberIndex++
    } else {
      formatted += format.mask[i]
    }
  }

  return formatted
}

export function getFullPhoneNumber(phone: string, countryCode: string): string {
  const format = getPhoneFormatByCountry(countryCode)
  if (!format) return phone

  const numbers = phone.replace(/\D/g, '')
  return `${format.prefix}${numbers}`
}
