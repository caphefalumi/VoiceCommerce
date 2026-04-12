// This function gets your whole document as its `body` and formats
// it as an article in the style of the IEEE.
#let ieee(
  // The paper's title.
  title: "Paper Title",
  sub_title: none,

  // An array of authors. For each author you can specify a name,
  // department, organization, location, and email. Everything but
  // but the name is optional.
  authors: (),

  // Date of submission for the paper.
  date_of_submission: none,

  // Render title block as a centered standalone cover page.
  center-cover-page: false,

  // Start visible page numbering from a specific number.
  page-number-start: 1,

  // Cover-page metadata (used only when center-cover-page is true).
  cover-institution: none,
  cover-course: none,
  cover-logo-path: none,
  cover-border: false,
  cover-border-inset: 6mm,
  cover-group-right-inset: 8mm,
  cover-group-bottom-gap: 12mm,
  cover-report-label: [Project Report:],
  cover-lecturer: none,
  cover-semester: none,
  cover-due-date: none,
  cover-group-name: none,

  // The paper's abstract. Can be omitted if you don't have one.
  abstract: none,

  // A list of index terms to display after the abstract.
  index-terms: (),

  // The article's paper size. Also affects the margins.
  paper-size: "us-letter",

  // The path to a bibliography file if you want to cite some external
  // works.
  bibliography-file: none,

  // The paper's content.
  body
) = {
  // Set document metdata.
  set document(title: title, author: authors.map(author => author.name))

  // Set the body font.
  set text(font: "TeX Gyre Termes", size: 10pt, spacing: .35em)
  set enum(numbering: "1)a)i)")
  // Configure the page.
  set page(
    paper: paper-size,
    numbering: "1",

    // The margins depend on the paper size.
    margin: if paper-size == "a4" {
      (x: 41.5pt, top: 80.51pt, bottom: 89.51pt)
    } else {
      (
        x: (50pt / 216mm) * 100%,
        top: (55pt / 279mm) * 100%,
        bottom: (64pt / 279mm) * 100%,
      )
    }
  )

  // Configure equation numbering and spacing.
  set math.equation(numbering: "(1)")
  show math.equation: set block(spacing: 0.65em)

  // Configure lists.
  set enum(indent: 0pt, body-indent: 15pt)
  set list(indent: 0pt, body-indent: 15pt)

  // Reset first-line-indent for enum items to prevent paragraph indent from affecting them
  show enum: it => {
    set par(first-line-indent: 0pt)
    it
  }

  // Configure headings.
  set heading(numbering: "I.A.a)")
  show heading: it => {
    // Find out the final number of the heading counter.
    let levels = counter(heading).get()
    let deepest = if levels != () {
      levels.last()
    } else {
      1
    }

    set text(12pt, weight: 400) // ヘディングのフォントサイズを指定
    if it.level == 1 {
      // First-level headings are centered smallcaps.
      // We don't want to number the acknowledgment section.
      let is-ack = it.body in ([Acknowledgment], [Acknowledgement], [Acknowledgments], [Acknowledgements])
      set align(center)
      set text(if is-ack { 13pt } else { 14pt }) // ヘディング1のフォントサイズ指定
      show: block.with(above: 15pt, below: 13.75pt, sticky: true)
      show: smallcaps
      if it.numbering != none and not is-ack {
        numbering("I.", deepest)
        h(7pt, weak: true)
      }
      it.body
    } else if it.level == 2 {
      // Second-level headings are run-ins.
      set par(first-line-indent: 0pt)
      set text(style: "italic")
      show: block.with(spacing: 20pt, sticky: true) // spacing: ヘディングのあとの行間スペース
      if it.numbering != none {
        numbering("A.", deepest)
        h(7pt, weak: true)
      }
      it.body
    } else [
      // Third level headings are run-ins too, but different.
      #if it.level == 3 {
        numbering("a)", deepest)
        [ ]
      }
      _#(it.body):_
    ]
  }
  show ref.where(form: "normal"): set ref(supplement: it => {
    if it.func() == figure {
      if it.kind == table {
        "Table"
      } else {
        "Fig."
      }
    }
  })
  // Render figure captions as "Fig. <number>. <caption>" or "Table <number>. <caption>"
  show figure.where(kind: table): set block(breakable: true)
  show figure: fig => {
    show figure.caption: it => context box(
      align(left)[
        #if fig.kind == table [
          Table~#it.counter.display(). #it.body
        ] else [
          Fig.~#it.counter.display(). #it.body
        ]
      ]
    )
    fig
  }

  // Display cover/title block.
  if center-cover-page {
    set page(numbering: none)
    set text(font: "TeX Gyre Heros")

    if cover-border {
      place(
        top + left,
        dx: cover-border-inset,
        dy: cover-border-inset,
        rect(
          width: 100% - 2 * cover-border-inset,
          height: 100% - 2 * cover-border-inset,
          stroke: 1pt + black,
          fill: none,
        ),
      )
    }

    v(4%)

    if cover-institution != none {
      align(center, text(20pt, weight: 700, cover-institution))
      v(4.5mm, weak: true)
    }

    if cover-course != none {
      align(center, text(13pt, weight: 700, cover-course))
      v(11mm, weak: true)
    }

    if cover-logo-path != none {
      align(center, image(cover-logo-path, width: 58mm))
      v(18mm, weak: true)
    }

    align(center, text(17pt, weight: 700, cover-report-label))
    v(4mm, weak: true)
    align(center, text(20pt, weight: 700, title))

    if sub_title != none {
      v(3mm, weak: true)
      align(center, text(14pt, sub_title))
    }

    v(11mm, weak: true)
    if cover-lecturer != none {
      align(center, text(12pt, [Lecturer Name: #cover-lecturer]))
      v(2.6mm, weak: true)
    }
    if cover-semester != none {
      align(center, text(12pt, [Semester: #cover-semester]))
      v(2.6mm, weak: true)
    }
    if date_of_submission != none {
      align(center, text(12pt, [Submission Date: #date_of_submission]))
      v(2.6mm, weak: true)
    }
    if cover-due-date != none {
      align(center, text(12pt, [Due Date: #cover-due-date]))
    }

    v(23%, weak: true)
    pad(right: cover-group-right-inset, {
      align(right, {
      if cover-group-name != none {
        text(13pt, [Group Name: #cover-group-name])
        v(2.5mm, weak: true)
      }
      for i in range(authors.len()) {
        let author = authors.at(i)
        if "studentid" in author {
          text(11.5pt, [#author.studentid - #author.name])
        } else {
          text(11.5pt, [#author.name])
        }
        if i < authors.len() - 1 {
          v(1.8mm, weak: true)
        }
      }
      })
    })
    v(cover-group-bottom-gap, weak: true)

    pagebreak()
    set page(numbering: "1")
    counter(page).update(page-number-start)
    set text(font: "TeX Gyre Termes", size: 10pt, spacing: .35em)
  } else {
    counter(page).update(page-number-start)
    v(3pt, weak: true)
    align(center, text(18pt, title))
    align(center, text(15pt, sub_title))

    // Display the date of submission if provided.
    if date_of_submission != none [
      #align(center, text(12pt, [Date of Submission: #date_of_submission]))
      #v(8.35mm, weak: true)
    ]

    // Display the authors list.
    for i in range(calc.ceil(authors.len() / 3)) {
      let end = calc.min((i + 1) * 3, authors.len())
      let is-last = authors.len() == end
      let slice = authors.slice(i * 3, end)
      grid(
        columns: slice.len() * (1fr,),
        gutter: 12pt,
        ..slice.map(author => align(center, {
          text(12pt, author.name)
          if "studentid" in author [
            \ #author.studentid
          ]
          if "class" in author [
            \ #emph(author.class)
          ]
          if "organization" in author [
            \ #emph(author.organization)
          ]
          if "location" in author [
            \ #author.location
          ]
          if "email" in author [
            \ #link("mailto:" + author.email)
          ]
        }))
      )

      if not is-last {
        v(16pt, weak: true)
      }
    }

    v(40pt, weak: true)
  }

  // Start two column mode and configure paragraph properties.
  show: columns.with(1, gutter: 12pt)
  set par(justify: true, first-line-indent: 0pt)

  // Display abstract and index terms.
  if abstract != none [
    #set text(weight: 700)
    #h(1em) _Abstract_---#abstract

    #if index-terms != () [
      #h(1em)_Index terms_---#index-terms.join(", ")
    ]
    #v(2pt)
  ]
  
  // Display the paper's contents.
  body

  // Display bibliography.
  if bibliography-file != none {
    show bibliography: set text(8pt)
    bibliography(bibliography-file, title: text(10pt)[References], style: "harvard-cite-them-right")
  }
}
