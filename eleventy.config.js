export default function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/favicon": "favicon" });
  eleventyConfig.addPassthroughCopy("src/home.css");
  eleventyConfig.addPassthroughCopy("src/detail.css");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/CNAME");

  eleventyConfig.addCollection("projects", collectionApi =>
    collectionApi.getFilteredByTag("projects").sort((a,b) => (a.data.order ?? 999) - (b.data.order ?? 999))
  );

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}
