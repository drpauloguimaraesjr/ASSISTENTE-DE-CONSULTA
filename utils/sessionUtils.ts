export const getPatientName = (anamnesis: string): string | null => {
    if (!anamnesis) return null;
    const match = anamnesis.match(/\[NOME DO PACIENTE\]\s*\n(.*?)\n/);
    const name = match && match[1] ? match[1].trim() : '';
    
    if (!name || name.toLowerCase().includes('escreva o nome') || name.toLowerCase().includes('não informado')) {
        return null;
    }
    return name;
};
