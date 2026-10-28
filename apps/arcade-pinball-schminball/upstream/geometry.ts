import type { TableDef } from './definitions/game';
/** Original XM perimeter rails; interior mechanisms come from the MIT table definitions. */
export function tableRails(table:TableDef):number[][]{
 const h=table.height;
 const rails=[[5,50,5,h-30,10],[5,50,90,16,14],[90,16,710,16,14],[710,16,795,90,14],[8,210,230,80,16]];
 // Both MIT table definitions already include their right wall. A second wall
 // here can push against it and wedge a ball at the table-one V-shaped blocker.
 // Table one's original wall stops at y=1930; extend only the uncovered section.
 if(table.underworld)rails.push([797,1930,797,h-30,10]);
 return rails;
}
