export const warningCharacter={mass:'engineer',power:'engineer',battery:'engineer',fuel:'engineer',slots:'engineer',data:'scientist',budget:'accountant'};
export function warningText(row){return `${row.name}: ${Number(row.used.toFixed(1))} ${row.unit} needed, ${Number(row.limit.toFixed(1))} ${row.unit} available. Adjust your equipment before launch.`;}
