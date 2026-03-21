export const AVATARS = [
    { id: 1, char: '🦊', name: 'Liška' },
    { id: 2, char: '🐱', name: 'Kočka' },
    { id: 3, char: '🐸', name: 'Žába' },
    { id: 4, char: '🐼', name: 'Panda' },
    { id: 5, char: '🐨', name: 'Koala' },
    { id: 6, char: '🐯', name: 'Tygr' },
    { id: 7, char: '🐷', name: 'Prase' },
    { id: 8, char: '🐵', name: 'Opice' },
    { id: 9, char: '🦄', name: 'Jednorožec' },
    { id: 10, char: '🐉', name: 'Drak' },
    { id: 11, char: '🚀', name: 'Raketa' },
    { id: 12, char: '💻', name: 'Kódování' },
    { id: 13, char: '🍕', name: 'Pizza' },
    { id: 14, char: '🎮', name: 'Gamer' },
    { id: 15, char: '🎸', name: 'Kytara' },
    { id: 16, char: '🌈', name: 'Duhová' },
];

export const getAvatarById = (id) => AVATARS.find(a => String(a.id) === String(id)) || null;
