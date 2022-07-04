import re
import subprocess


release_header_pattern = re.compile(r"## (v[\d]+\.[\d]+\.[\d]) \([\d]{4}-[\d]{2}-[\d]{2}\)", flags=0)


def main():
    changelog_text, version = get_changelog()
    print(changelog_text)
    output_string = subprocess.check_output(
        ["gh", "release", "create", version,
         "--draft",
         "--title", f"Jaeger UI {version}",
         "--repo", "jaegertracing/jaeger-ui",
         "-F", "-"],
        input=changelog_text,
        text=True,
    )
    print(f"Draft created at: {output_string}")
    print("Please review, then edit it and click 'Publish release'.")


def get_changelog():
    changelog_text = ""
    in_changelog_text = False
    version = ""
    with open("CHANGELOG.md") as f:
        for line in f:
            m = release_header_pattern.match(line)

            if m is not None:
                # Found the first release.
                if not in_changelog_text:
                    in_changelog_text = True
                    version = m.group(1)
                else:
                    # Found the next release.
                    break
            elif in_changelog_text:
                changelog_text += line

    return changelog_text, version


if __name__ == "__main__":
    main()
