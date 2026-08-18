export interface CourtDirectoryEntry {
  name: string;
  email: string;
  phone?: string;
  location?: string;
}

export const COSTA_RICA_COURTS: Record<string, CourtDirectoryEntry> = {
  "juzgado_cobro_sj_1": {
    name: "Juzgado Primero Especializado de Cobro de San José (Edificio Anexo A)",
    email: "cobro1-sj@poder-judicial.go.cr",
    location: "San José, Barrio González Lahmann",
  },
  "juzgado_cobro_sj_2": {
    name: "Juzgado Segundo Especializado de Cobro de San José",
    email: "cobro2-sj@poder-judicial.go.cr",
    location: "San José, Calle 17 y 19, Avenida 6 y 8",
  },
  "juzgado_cobro_sj": {
    name: "Juzgado Especializado de Cobro de San José",
    email: "cobro-sj@poder-judicial.go.cr",
    location: "San José",
  },
  "juzgado_cobro_heredia": {
    name: "Juzgado Especializado de Cobro de Heredia",
    email: "cobro-heredia@poder-judicial.go.cr",
    location: "Heredia Centro",
  },
  "juzgado_cobro_alajuela": {
    name: "Juzgado Especializado de Cobro de Alajuela",
    email: "cobro-ala@poder-judicial.go.cr",
    location: "Alajuela Centro, Edificio de Tribunales",
  },
  "juzgado_cobro_san_carlos": {
    name: "Juzgado Civil y de Cobro de San Carlos (Ciudad Quesada)",
    email: "cobro-sc@poder-judicial.go.cr",
    location: "San Carlos, Alajuela",
  },
  "juzgado_cobro_cartago": {
    name: "Juzgado Especializado de Cobro de Cartago",
    email: "cobro-cartago@poder-judicial.go.cr",
    location: "Cartago Centro",
  },
  "juzgado_cobro_puntarenas": {
    name: "Juzgado Especializado de Cobro de Puntarenas",
    email: "cobro-pnt@poder-judicial.go.cr",
    location: "Puntarenas Centro",
  },
  "juzgado_cobro_guanacaste": {
    name: "Juzgado Civil y de Cobro de Guanacaste (Liberia)",
    email: "cobro-lib@poder-judicial.go.cr",
    location: "Liberia, Guanacaste",
  },
  "juzgado_cobro_santa_cruz": {
    name: "Juzgado Civil y de Cobro de Santa Cruz",
    email: "cobro-scruz@poder-judicial.go.cr",
    location: "Santa Cruz, Guanacaste",
  },
  "juzgado_cobro_limon": {
    name: "Juzgado Civil y de Cobro de Limón",
    email: "cobro-lim@poder-judicial.go.cr",
    location: "Limón Centro",
  },
  "juzgado_cobro_pococi": {
    name: "Juzgado Civil y de Cobro de Pococí (Guápiles)",
    email: "cobro-pococi@poder-judicial.go.cr",
    location: "Guápiles, Pococí",
  },
  "juzgado_cobro_perez_zeledon": {
    name: "Juzgado Especializado de Cobro de Pérez Zeledón",
    email: "cobro-pz@poder-judicial.go.cr",
    location: "San Isidro de El General, Pérez Zeledón",
  },
  "juzgado_civil_garabito": {
    name: "Juzgado Contravencional y Menor Cuantía de Garabito (Jacó)",
    email: "jcont-garabito@poder-judicial.go.cr",
    location: "Jacó, Garabito, Puntarenas",
  },
  "juzgado_civil_quepos": {
    name: "Juzgado Civil y de Trabajo de Quepos y Parrita",
    email: "jpc-quepos@poder-judicial.go.cr",
    location: "Quepos, Puntarenas",
  },
  "juzgado_civil_grecia": {
    name: "Juzgado Civil y de Cobro de Grecia",
    email: "cobro-grecia@poder-judicial.go.cr",
    location: "Grecia, Alajuela",
  },
  "juzgado_civil_san_ramon": {
    name: "Juzgado Civil y de Cobro de San Ramón",
    email: "cobro-sramon@poder-judicial.go.cr",
    location: "San Ramón, Alajuela",
  },
  "default": {
    name: "Despacho Judicial a Cargo",
    email: "gestionenlinea@poder-judicial.go.cr",
    location: "Poder Judicial de Costa Rica",
  }
};

/**
 * Intelligent resolver mapping court strings extracted from court notices
 * to the exact verified institutional email address of the Costa Rican Poder Judicial.
 */
export function resolveCourtEntry(courtName?: string | null): CourtDirectoryEntry {
  if (!courtName) return COSTA_RICA_COURTS["default"];
  
  const text = courtName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (text.includes("san jose") || text.includes("primer circuito") || text.includes("i circuito")) {
    if (text.includes("segundo") || text.includes("2")) {
      return COSTA_RICA_COURTS["juzgado_cobro_sj_2"];
    }
    return COSTA_RICA_COURTS["juzgado_cobro_sj_1"];
  }

  if (text.includes("heredia")) {
    return COSTA_RICA_COURTS["juzgado_cobro_heredia"];
  }

  if (text.includes("alajuela")) {
    return COSTA_RICA_COURTS["juzgado_cobro_alajuela"];
  }

  if (text.includes("san carlos") || text.includes("ciudad quesada")) {
    return COSTA_RICA_COURTS["juzgado_cobro_san_carlos"];
  }

  if (text.includes("cartago")) {
    return COSTA_RICA_COURTS["juzgado_cobro_cartago"];
  }

  if (text.includes("puntarenas")) {
    return COSTA_RICA_COURTS["juzgado_cobro_puntarenas"];
  }

  if (text.includes("garabito") || text.includes("jaco")) {
    return COSTA_RICA_COURTS["juzgado_civil_garabito"];
  }

  if (text.includes("quepos") || text.includes("parrita") || text.includes("aguirre")) {
    return COSTA_RICA_COURTS["juzgado_civil_quepos"];
  }

  if (text.includes("liberia") || text.includes("guanacaste")) {
    return COSTA_RICA_COURTS["juzgado_cobro_guanacaste"];
  }

  if (text.includes("santa cruz") || text.includes("nicoya")) {
    return COSTA_RICA_COURTS["juzgado_cobro_santa_cruz"];
  }

  if (text.includes("pococi") || text.includes("guapiles")) {
    return COSTA_RICA_COURTS["juzgado_cobro_pococi"];
  }

  if (text.includes("limon")) {
    return COSTA_RICA_COURTS["juzgado_cobro_limon"];
  }

  if (text.includes("perez zeledon") || text.includes("san isidro")) {
    return COSTA_RICA_COURTS["juzgado_cobro_perez_zeledon"];
  }

  if (text.includes("grecia")) {
    return COSTA_RICA_COURTS["juzgado_civil_grecia"];
  }

  if (text.includes("san ramon")) {
    return COSTA_RICA_COURTS["juzgado_civil_san_ramon"];
  }

  return {
    name: courtName,
    email: "gestionenlinea@poder-judicial.go.cr",
    location: "Poder Judicial de Costa Rica",
  };
}
