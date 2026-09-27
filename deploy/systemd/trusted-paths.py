#!/usr/bin/env python3
"""Reject mutable administrative inputs. Run only from a trusted installation."""

import argparse
import os
from pathlib import Path
import stat


def protected(raw_path: str, tree: bool = False) -> None:
	if not os.path.isabs(raw_path) or any(part in (".", "..") for part in raw_path.split(os.sep)):
		raise ValueError(f"Administrative input must be absolute without dot components: {raw_path}")
	path = Path(raw_path)
	for item in (path, *path.parents):
		metadata = item.lstat()
		if stat.S_ISLNK(metadata.st_mode) or metadata.st_uid != 0 or metadata.st_mode & 0o022:
			raise ValueError(f"Administrative input is not protected: {item}")
		if not (stat.S_ISDIR(metadata.st_mode) or stat.S_ISREG(metadata.st_mode)):
			raise ValueError(f"Administrative input has an unsafe type: {item}")
	if tree:
		for item in path.rglob("*"):
			metadata = item.lstat()
			is_regular = stat.S_ISREG(metadata.st_mode) and metadata.st_nlink == 1
			if (
				stat.S_ISLNK(metadata.st_mode)
				or metadata.st_uid != 0
				or metadata.st_mode & 0o022
				or not (stat.S_ISDIR(metadata.st_mode) or is_regular)
			):
				raise ValueError(f"Release tree is not protected: {item}")


if __name__ == "__main__":
	parser = argparse.ArgumentParser(description=__doc__)
	parser.add_argument("--tree", action="append", default=[])
	parser.add_argument("paths", nargs="*")
	args = parser.parse_args()
	if os.geteuid() != 0:
		raise SystemExit("Administrative path validation requires root.")
	for supplied in args.paths:
		protected(supplied)
	for supplied in args.tree:
		protected(supplied, tree=True)
