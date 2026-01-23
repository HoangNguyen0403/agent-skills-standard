# iOS UI & Layout Implementation

## Programmatic Auto Layout (SnapKit)

```swift
import SnapKit

class ProfileHeaderView: UIView {
    let avatarImageView = UIImageView()
    let nameLabel = UILabel()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupSubviews()
    }

    private func setupSubviews() {
        addSubview(avatarImageView)
        addSubview(nameLabel)

        avatarImageView.snp.makeConstraints { make in
            make.top.left.equalToSuperview().inset(16)
            make.size.equalTo(60)
        }

        nameLabel.snp.makeConstraints { make in
            make.centerY.equalTo(avatarImageView)
            make.left.equalTo(avatarImageView.snp.right).offset(12)
            make.right.equalToSuperview().inset(16)
        }
    }
}
```

## Native Layout Anchors

```swift
NSLayoutConstraint.activate([
    avatarImageView.topAnchor.constraint(equalTo: self.topAnchor, constant: 16),
    avatarImageView.leadingAnchor.constraint(equalTo: self.leadingAnchor, constant: 16),
    avatarImageView.widthAnchor.constraint(equalToConstant: 60),
    avatarImageView.heightAnchor.constraint(equalToConstant: 60),

    nameLabel.centerYAnchor.constraint(equalTo: avatarImageView.centerYAnchor),
    nameLabel.leadingAnchor.constraint(equalTo: avatarImageView.trailingAnchor, constant: 12),
    nameLabel.trailingAnchor.constraint(equalTo: self.trailingAnchor, constant: -16)
])
```

## Accessibility Implementation

```swift
func setupAccessibility() {
    nameLabel.isAccessibilityElement = true
    nameLabel.accessibilityLabel = "User Name"
    nameLabel.accessibilityTraits = .staticText
    nameLabel.font = .preferredFont(forTextStyle: .headline)
    nameLabel.adjustsFontForContentSizeCategory = true
}
```
