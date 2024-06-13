const implSemi = repeat1(/[;\n]/)
const optSemi = repeat(/[;\n]/)
const optSeq = (...rules) => optional(seq(...rules))
const repSeq = (...rules) => repeat(seq(...rules))
const delimSeq = (delim, ...rules) => seq(optSeq(...rules), repSeq(delim, ...rules))

module.exports = grammar({
  name: "umka",

  inline: $ => [
    $.decl,
    $.stmt,
    $.expr,
    $.number,
    $.varDecl,
    $.declAssignmentStmt,
  ],

  extras: $ => [
    $.comment,
    /[ \t]/,
  ],

  word: $ => $.ident,

  conflicts: $ => [],

  rules: {
    program: $ => seq(
      optional($.import),
      repeat($.decl)
    ),

    import: $ => choice(
      seq(
        'import',
        $.importItem
      ),
      seq(
        'import',
        '(',
        optSemi,
        repeat($.importItem),
        ')',
        implSemi
      )
    ),

    importItem: $ => seq(
      choice(
        seq(field('name', $.ident), '=', $.stringLiteral),
        $.stringImportLiteral
      ),
      implSemi
    ),

    decl: $ => seq(choice(
      $.fnDecl,
      $.methodDecl,
      $.varDecl,
      $.typeDecl,
      $.constDecl,
    )),

    constDecl: $ => seq('const', choice(
      $.constDeclItem,
      seq("(", optSemi, repSeq($.constDeclItem), ")", implSemi),
    )),

    constDeclItem: $ => seq(
      field('name', $.ident),
      optional($.exportMark),
      '=', field('value', $.expr),
      implSemi,
    ),

    varDecl: $ => choice(
      $.fullVarDecl,
      alias($.declAssignmentStmt, $.shortVarDecl)
    ),

    fullVarDecl: $ => seq("var", choice(
      $.varDeclItem,
      seq("(", optSemi, repSeq($.varDeclItem), ")"),
    )),

    varDeclItem: $ => seq(
      field('identifiers', $.typedIdentList),
      optSeq("=", field('value', $.expr)),
      implSemi,
    ),

    exportMark: $ => '*',

    identList: $ => seq(
      $.ident, field('exported', optional('*')),
      repSeq(",", $.ident, field('exported', optional($.exportMark))),
    ),

    typedIdentList: $ => seq($.identList, ":", optional(".."), $.type),

    typeDecl: $ => seq('type',
      choice($.typeDeclItem, seq("(", repSeq($.typeDeclItem), ")"))
    ),

    typeDeclItem: $ => seq(
      field('name', $.ident),
      optional($.exportMark),
      '=', $.type,
      implSemi
    ),

    type: $ => choice(
      $.qualIdent,
      $.ptrType,
      $.arrayType,
      $.dynArrayType,
      $.enumType,
      $.structType,
      $.mapType,
      $.interfaceType,
      $.closureType,
    ),

    ptrType: $ => seq(optional("weak"), '^', $.type),
    arrayType: $ => seq('[', $.expr, ']', $.type),
    dynArrayType: $ => seq('[', ']', $.type),
    enumType: $ => seq('enum', '{', repeat($.enumItem), '}'),
    enumItem: $ => seq(field('name', $.ident), implSemi),
    structType: $ => seq('struct', '{', optSemi, repSeq($.typedIdentList, implSemi), '}'),

    mapType: $ => seq('map', '[', $.type, ']', $.type),
    interfaceType: $ => seq('interface', '{', repeat($.interfaceItem), '}'),

    interfaceItem: $ => choice(
      field('type', $.ident),
      seq(field('name', $.ident), $.signature),
    ),

    closureType: $ => seq('fn', $.signature),

    signature: $ => seq($.parameterList, optSeq(':', $.type)),

    declAssignmentStmt: $ => seq(
      field('identifiers', $.identList),
      ":=", field('values', $.exprList)
    ),

    fnDecl: $ => seq("fn",
      field('name', $.ident),
      optional(field('exported', '*')),
      field('signature', $.signature),
      optional(field('body', $.block)),
      implSemi
    ),

    methodDecl: $ => seq("fn",
      field('receiver', $.rcvSignature),
      field('name', $.ident),
      optional(field('exported', '*')),
      field('signature', $.signature),
      optional(field('body', $.block)),
      implSemi
    ),

    rcvSignature: $ => seq("(",
      field('name', $.ident), ":",
      field('type', $.type),
      ")"),

    exprList: $ => seq($.expr, repSeq(",", $.expr)),

    parameterList: $ => seq(
      "(",
      delimSeq(
        field('params', $.typedIdentList),
        optSeq('=', field('defaultValue', $.expr)),
      ),
      ")"
    ),

    block: $ => seq("{", optSemi, repSeq($.stmt), "}"),

    stmt: $ => choice(
      seq(alias($.designator, $.callStmt), implSemi),
      $.block,
      $.decl,
    ),

    expr: $ => choice($.stringLiteral, $.number, $.primary, $.mapLiteral, $.arrayLiteral),

    arrayLiteral: $ => prec(1, seq("{", delimSeq(",", optSemi, $.expr), optSemi, "}")),
    mapLiteral: $ => seq("{", delimSeq(",", $.expr, ':', optSemi, $.expr), optSemi, "}"),

    designator: $ => $.primary,

    primary: $ => choice($.qualIdent, $.builtinCall),

    qualIdent: $ => seq(
      optSeq(field('module', $.ident), '::'),
      field('name', $.ident)
    ),

    builtinCall: $ => choice(
      $.builtinCallFmt,
      $.builtinCallMake,
      $.builtinCall1Type,
      $.builtinCallBasic,
    ),

    builtinCallBasic: $ => seq(
      choice('append', 'atan', 'atan2', 'cap', 'ceil', 'copy', 'cos',
        'delete', 'exit', 'exp', 'fabs', 'fiberalive', 'fibercall',
        'fiberspawn', 'floor', 'insert', 'keys', 'len', 'log', 'memusage', 'round',
        'selfhasptr', 'selftypeeq', 'sin', 'sizeofself', 'slice', 'sqrt', 'trunc',
        'valid', 'validkey'),
      field('arguments', seq(
        "(", $.expr, repSeq(",", $.expr), ")",
      ))
    ),

    builtinCallFmt: $ => seq(
      choice('printf', 'sprintf', 'fprintf', 'scanf', 'sscanf', 'fscanf'),
      field('arguments', seq(
        "(", $.stringFmtLiteral, optSeq(',', $.expr, repSeq(",", $.expr)), ")",
      ))
    ),

    builtinCallMake: $ => seq(
      'make',
      field('arguments', seq(
        "(", $.type, ',', $.expr, ")",
      ))
    ),

    builtinCall1Type: $ => seq(
      choice('new', 'sizeof', 'typeptr'),
      field('arguments', seq(
        "(", $.type, ")",
      ))
    ),

    ident: $ => /[A-Za-z_][A-Za-z_0-9]*/,

    number: $ => choice($.realNumber, $.hexNumber, $.decNumber),

    decNumber: $ => /[0-9]+/,
    hexNumber: $ => /0x[0-9a-fA-F]+/,

    realNumber: $ => choice(
      /[0-9]+\.[0-9]+/,
      /[0-9]+[Ee]\-?[0-9]+/,
      /[0-9]+\.[0-9]+[Ee]\-?[0-9]+/,
    ),

    charLiteral: $ => seq("'", repeat(choice($.escSeq, /./)), '"'),
    stringLiteral: $ => seq('"', repeat(choice($.escSeq, /./)), '"'),
    stringFmtLiteral: $ => seq('"', repeat(choice($.escSeq, $.fmtSeq, /./)), '"'),
    stringImportLiteral: $ => seq('"', repeat(choice($.escSeq, $.modSeq, /./)), '"'),

    fmtSeq: $ => /\%[-+\s#0]?([0-9]+|\*)?(\.[0-9]*)?(hh|h|l|ll)?[diuxXfFeEgGscv%]/,
    escSeq: $ => choice(/\\[0abefnrtv]/, /\\x[0-9a-fA-F][0-9a-fA-F]*/),
    modSeq: $ => seq(field('name', $.ident), '.um'),

    comment: $ => token(choice(
      seq('//', /.*/),
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '/',
      ),
    )),
  }
})
