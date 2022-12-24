# fediscope

Discover fediverse accounts using Wikidata.

# How it works

The tool uses the Wikidata query service at https://query.wikidata.org/ to
look up accounts with the ["Mastodon address" property](https://www.wikidata.org/wiki/Property:P4033)
that inclusively match an occupation. It then renders the results in a table
and lets you download them as a Mastodon-compatible CSV file.

# Limitations

- Wikidata information is sometimes outdated
- Taxonomy can be surprising (e.g., anyone who's written an op-ed is an
  opinion journalist, and therefore also a journalist)
- Notability criteria for inclusion in Wikidata can seem arbitrary
- Not mobile-friendly

# Improvements welcome

- Any and all issue reports and PRs are appreciated
- Would be great to expand the tool with other capabilities, e.g., searching
  organization types.

# License

Public domain (CC-0). Do whatever you want with it.
