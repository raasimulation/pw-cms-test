export default {
  layout: "project.njk",
  tags: ["projects"],
  permalink: (data) => `/pages/${data.page.fileSlug}.html`
};
