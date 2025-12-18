export const AVAILABLE_COLORS = [
    { name: 'Walnut', value: 'walnut', bg: 'bg-[#5D432C]', text: 'text-[#5D432C]' },
    { name: 'Oak', value: 'oak', bg: 'bg-[#B5936D]', text: 'text-[#B5936D]' },
    { name: 'Honey', value: 'honey', bg: 'bg-[#DCC7A1]', text: 'text-[#DCC7A1]' },
    { name: 'Ash', value: 'ash', bg: 'bg-[#E5E1D8]', text: 'text-[#E5E1D8]' },
    { name: 'Teak', value: 'teak', bg: 'bg-[#966F47]', text: 'text-[#966F47]' },
    { name: 'Forest', value: 'forest', bg: 'bg-[#4B5332]', text: 'text-[#4B5332]' },
    { name: 'Clay', value: 'clay', bg: 'bg-[#9C6B50]', text: 'text-[#9C6B50]' },
];

export const getColorClass = (colorValue: string, type: 'bg' | 'text' | 'border' | 'ring' | 'gradient', weight?: string | number) => {
    const woodColor = AVAILABLE_COLORS.find(c => c.value === colorValue);

    if (woodColor) {
        const hexMatch = woodColor.bg.match(/\[(.*?)\]/);
        const hex = hexMatch ? hexMatch[1] : '#333333';

        // For wood colors, we map weights (100-900) to opacities for background/text
        const opacityMap: Record<string, string> = {
            '50': '/5',
            '100': '/10',
            '200': '/20',
            '300': '/40',
            '400': '/60',
            '500': '',
            '600': '',
            '700': '',
            '800': '',
            '900': ''
        };

        const opacity = weight ? (opacityMap[String(weight)] || '') : '';

        if (type === 'bg') return `${woodColor.bg}${opacity}`;
        if (type === 'text') return `${woodColor.text}${opacity}`;
        if (type === 'border') return `border-[${hex}]${opacity}`;
        if (type === 'ring') return `ring-[${hex}]${opacity}`;
        if (type === 'gradient') return `from-[${hex}]`;
        return woodColor.bg;
    }

    // Fallback for standard Tailwind colors
    const typePrefixMap = {
        bg: 'bg',
        text: 'text',
        border: 'border',
        ring: 'ring',
        gradient: 'from'
    };
    const prefix = typePrefixMap[type] || 'bg';

    // Default weight if not provided
    const finalWeight = weight || ((type === 'bg' || type === 'text') ? '500' : '400');

    return `${prefix}-${colorValue}-${finalWeight}`;
};
